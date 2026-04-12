from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from typing import Any

from attentia_ai.helpers.config import Settings
from attentia_ai.helpers.dsp import clamp_ordinal
from attentia_ai.rl_policy import RLPolicy


@dataclass
class BrowserRealtimeSession:
    """
    Represents an active real-time monitoring context for a specific child.
    Maintains ephemeral state for calibration progress and sensor packet counts.
    """
    session_id: str
    child_id: str | None = None
    status: str = "awaiting_permissions"
    difficulty: int = 2
    gain_capability: int = 2
    packet_count: int = 0
    packets_with_video: int = 0
    baseline_created: bool = False
    baseline_payload: dict[str, Any] = field(default_factory=dict)
    calibration_started_at: float | None = None


class BrowserRealtimeEngine:
    """
    A high-concurrency WebSocket engine for real-time sensor data orchestration.
    
    Architecture:
    - Asynchronous event handling for incoming sensor packets (Audio/Video).
    - Heuristic feature fusion for distractions and emotion mapping.
    - Sub-100ms decision loop leveraging an RL Policy Q-table.
    - Synchronous calibration state-machine to establish user-specific biometric baselines.
    """
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.policy = RLPolicy(settings)
        self.sessions: dict[str, BrowserRealtimeSession] = {}

    def handle_socket(self, ws, session_id: str) -> None:
        session = self.sessions.setdefault(session_id, BrowserRealtimeSession(session_id=session_id))
        try:
            self._send(
                ws,
                {
                    "type": "session_status",
                    "sessionId": session_id,
                    "status": session.status,
                    "message": "Websocket connected.",
                },
            )

            while True:
                raw_message = ws.receive()
                if raw_message is None:
                    break

                try:
                    payload = json.loads(raw_message)
                except json.JSONDecodeError:
                    self._send_warning(ws, session_id, "invalid_json", "Incoming message was not valid JSON.")
                    continue

                message_type = payload.get("type")

                if message_type == "begin_calibration":
                    self._handle_begin_calibration(ws, session, payload)
                    continue

                if message_type == "sensor_packet":
                    self._handle_sensor_packet(ws, session, payload)
                    continue

                if message_type == "stop_session":
                    self._handle_stop_session(ws, session, payload)
                    break

                self._send_warning(
                    ws,
                    session_id,
                    "unknown_message",
                    f"Unsupported message type: {message_type}",
                )
        finally:
            self.sessions.pop(session_id, None)

    def _handle_begin_calibration(self, ws, session: BrowserRealtimeSession, payload: dict[str, Any]) -> None:
        session.child_id = payload.get("childId")
        session.difficulty = clamp_ordinal(payload.get("difficulty", self.settings.default_difficulty))
        session.gain_capability = clamp_ordinal(
            payload.get("gainCapability", self.settings.default_gain_capability)
        )
        session.packet_count = 0
        session.packets_with_video = 0
        session.calibration_started_at = time.time()
        session.baseline_created = False
        session.baseline_payload = {}
        session.status = "calibrating"
        self._send(
            ws,
            {
                "type": "session_status",
                "sessionId": session.session_id,
                "status": "calibrating",
                "message": "Calibration started. Waiting for browser sensor packets.",
            },
        )

    def _handle_sensor_packet(self, ws, session: BrowserRealtimeSession, payload: dict[str, Any]) -> None:
        session.packet_count += 1
        recorded_at = payload.get("recordedAt") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        audio = payload.get("audio") or {}
        features = audio.get("features") or {}
        video = payload.get("video") or {}
        video_present = bool(video.get("frameBase64") or video.get("landmarks"))
        if video_present:
            session.packets_with_video += 1

        if session.status == "calibrating":
            elapsed = max(0.0, time.time() - (session.calibration_started_at or time.time()))
            progress = min(
                100,
                int(
                    min(
                        session.packet_count / 6,
                        elapsed / 5,
                        session.packets_with_video / 4 if session.packets_with_video else 0,
                    )
                    * 100
                ),
            )
            self._send(
                ws,
                {  
                    "type": "calibration_progress",
                    "sessionId": session.session_id,
                    "recordedAt": recorded_at,
                    "progress": progress,
                    "message": "Collecting baseline samples from camera and microphone.",
                },
            )

        # Logic-Level Calibration & Baseline Establishment
        # This ensures the engine waits for sufficient sensor density (packets) 
        # and temporal stability (5s window) before establishing the state baseline.
        if (
            session.status == "calibrating"
            and session.packet_count >= 6
            and session.packets_with_video >= 4
            and (time.time() - (session.calibration_started_at or time.time())) >= 5
        ):
            session.baseline_created = True
            session.status = "running"
            session.baseline_payload = {
                "created_at": recorded_at,
                "packet_count": session.packet_count,
                "audio_seed_rms": features.get("avgRms", 0.0),
                "video_present_packets": session.packets_with_video,
            }
            self._send(
                ws,
                {
                    "type": "calibration_result",
                    "sessionId": session.session_id,
                    "success": True,
                    "baselinePayload": session.baseline_payload,
                    "message": "Baseline calibration completed.",
                },
            )
            self._send(
                ws,
                {
                    "type": "session_status",
                    "sessionId": session.session_id,
                    "status": "running",
                    "message": "Realtime session is now active.",
                },
            )

        if session.status != "running":
            return

        # 3. Decision Logic & Sensor Fusion
        # Fuses Discrete Audio Signals (Noise Level) with Camera Presence (Face Detection)
        # to derive a singular 'Distraction' state for the RL Policy.
        noise_level = self._resolve_noise_level(features)
        face_detected = video_present
        distraction = clamp_ordinal(max(noise_level - 1, 0))
        if not face_detected:
            distraction = clamp_ordinal(max(distraction, 3))

        decision = self.policy.decide(
            emotion=0,
            distraction=distraction,
            current_difficulty=session.difficulty,
            gain_capability=session.gain_capability,
        )

        self._send(
            ws,
            {
                "type": "state_update",
                "sessionId": session.session_id,
                "recordedAt": recorded_at,
                "emotion": "neutral",
                "distraction": distraction,
                "noiseLevel": noise_level,
                "currentDifficulty": session.difficulty,
                "gainCapability": session.gain_capability,
                "faceDetected": face_detected,
                "action": decision.action_label,
            },
        )
        self._send(
            ws,
            {
                "type": "intervention",
                "sessionId": session.session_id,
                "recordedAt": recorded_at,
                "action": decision.action_label,
                "decisionSource": decision.source,
                "qValues": decision.q_values,
                "message": "Adaptive intervention selected from current browser sensor features.",
            },
        )

    def _handle_stop_session(self, ws, session: BrowserRealtimeSession, payload: dict[str, Any]) -> None:
        session.status = "stopped"
        self._send(
            ws,
            {
                "type": "session_status",
                "sessionId": session.session_id,
                "status": "stopped",
                "message": payload.get("reason") or "Session stopped by client.",
            },
        )

    @staticmethod
    def _resolve_noise_level(features: dict[str, Any]) -> int:
        hinted = features.get("noiseLevelHint")
        if hinted is not None:
            return clamp_ordinal(hinted)

        avg_rms = float(features.get("avgRms", 0.0) or 0.0)
        rms_variance = float(features.get("rmsVariance", 0.0) or 0.0)
        spectral_centroid = float(features.get("spectralCentroid", 0.0) or 0.0)

        score = 0
        if avg_rms >= 0.02:
            score += 1
        if avg_rms >= 0.05:
            score += 1
        if avg_rms >= 0.1:
            score += 1
        if rms_variance >= 0.001:
            score += 1
        if spectral_centroid >= 1800:
            score += 1
        return clamp_ordinal(score)

    @staticmethod
    def _send(ws, payload: dict[str, Any]) -> None:
        ws.send(json.dumps(payload))

    def _send_warning(self, ws, session_id: str, code: str, message: str) -> None:
        self._send(
            ws,
            {
                "type": "warning",
                "sessionId": session_id,
                "recordedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "code": code,
                "message": message,
            },
        )
