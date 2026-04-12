from __future__ import annotations

import threading
import time
from dataclasses import asdict, dataclass, field
from typing import Any

from attentia_ai.audio_service import AudioMonitorService
from attentia_ai.camera_service import CameraMonitorService
from attentia_ai.helpers.config import Settings
from attentia_ai.helpers.dsp import clamp_ordinal
from attentia_ai.rl_policy import RLPolicy


@dataclass
class SessionState:
    running: bool = False
    calibrated: bool = False
    difficulty: int = 2
    gain_capability: int = 2
    emotion: int = 0
    distraction: int = 0
    current_action: int = 4
    current_action_label: str = "do_nothing"
    updated_at: float = field(default_factory=time.time)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class StudySessionManager:
    """
    The central orchestration engine for the Attentia platform.
    
    Responsibilities:
    - Lifecycle management of real-time sensor streams (Audio/Camera).
    - Coordination of biometric calibration phases.
    - Execution of the primary adaptive decision loop (RL Policy integration).
    - Thread-safe state management and payload aggregation for client delivery.
    """
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.audio = AudioMonitorService(settings)
        self.camera = CameraMonitorService(settings)
        self.policy = RLPolicy(settings)
        
        # Thread-safety for concurrent sensor updates and API polling
        self._lock = threading.Lock()
        self._loop_thread: threading.Thread | None = None
        self._stop_event = threading.Event()
        
        # Internal application state
        self._state = SessionState(
            difficulty=settings.default_difficulty,
            gain_capability=settings.default_gain_capability,
        )
        self._latest_payload: dict[str, Any] = self._build_payload(
            calibration=None,
            camera=None,
            audio=self.audio.snapshot().to_dict(),
            decision=None,
        )

    def start(self) -> dict[str, Any]:
        """
        Initializes the session lifecycle. 
        Triggers hardware sensors, performs initial calibration, and spawns the background decision thread.
        """
        with self._lock:
            if self._state.running:
                return self._latest_payload

            # Hardware service activation
            self.camera.start()
            self.audio.start()
            
            # Synchronous calibration phase to establish biometric baseline
            calibration = self.camera.calibrate()

            self._state.running = True
            self._state.calibrated = self.camera.baseline is not None
            self._state.updated_at = time.time()

            # Start asynchronous orchestration loop
            self._stop_event.clear()
            self._loop_thread = threading.Thread(target=self._run_loop, daemon=True)
            self._loop_thread.start()

            self._latest_payload = self._build_payload(
                calibration=calibration.to_dict(),
                camera=calibration.to_dict(),
                audio=self.audio.snapshot().to_dict(),
                decision=None,
            )
            return self._latest_payload

    def stop(self) -> dict[str, Any]:
        self._stop_event.set()
        if self._loop_thread is not None:
            self._loop_thread.join(timeout=1.0)
            self._loop_thread = None

        self.audio.stop()
        self.camera.stop()

        with self._lock:
            self._state.running = False
            self._state.emotion = 0
            self._state.distraction = 0
            self._state.current_action = 4
            self._state.current_action_label = "do_nothing"
            self._state.updated_at = time.time()
            self._latest_payload = self._build_payload(
                calibration=None,
                camera=None,
                audio=self.audio.snapshot().to_dict(),
                decision=None,
            )
            return self._latest_payload

    def update_profile(self, difficulty: int | None, gain_capability: int | None) -> dict[str, Any]:
        with self._lock:
            if difficulty is not None:
                self._state.difficulty = clamp_ordinal(difficulty)
            if gain_capability is not None:
                self._state.gain_capability = clamp_ordinal(gain_capability)
            self._state.updated_at = time.time()
            self._latest_payload = self._build_payload(
                calibration=self.camera.baseline.to_dict() if self.camera.baseline else None,
                camera=self._latest_payload.get("camera"),
                audio=self._latest_payload.get("audio"),
                decision=self._latest_payload.get("decision"),
            )
            return self._latest_payload

    def status(self) -> dict[str, Any]:
        with self._lock:
            return self._latest_payload

    def preflight(self) -> dict[str, Any]:
        camera = self.camera.diagnostics()
        audio = self.audio.diagnostics()
        policy = self.policy.diagnostics()

        issues = []
        issues.extend(camera.get("warnings", []))
        issues.extend(audio.get("warnings", []))
        issues.extend(policy.get("warnings", []))
        if camera.get("permission_hint"):
            issues.append(camera["permission_hint"])

        ready = policy["loaded"] and audio["available"]
        return {
            "ready": ready,
            "camera": camera,
            "audio": audio,
            "policy": policy,
            "issues": issues,
        }

    def _run_loop(self) -> None:
        """
        Main execution loop for the adaptive learning engine.
        Periodically samples sensor state, resolves policy, and updates thread-safe state.
        """
        while not self._stop_event.is_set():
            # 1. High-frequency sensor sampling
            camera_snapshot = self.camera.sample_against_baseline()
            audio_snapshot = self.audio.snapshot()
            
            # 2. Logic-level feature fusion (Combines CV and Audio signals)
            distraction = self._combine_distraction(
                camera_distraction=camera_snapshot.distraction_hint,
                audio_noise=audio_snapshot.noise_level,
                face_detected=camera_snapshot.face_detected,
            )

            # 3. Policy Execution (Resolves current state to optimal intervention)
            decision = self.policy.decide(
                emotion=camera_snapshot.emotion,
                distraction=distraction,
                current_difficulty=self._state.difficulty,
                gain_capability=self._state.gain_capability,
            )

            with self._lock:
                # 4. Atomic state update for API consistency
                self._state.calibrated = self.camera.baseline is not None
                self._state.emotion = camera_snapshot.emotion
                self._state.distraction = distraction
                self._state.current_action = decision.action_index
                self._state.current_action_label = decision.action_label
                self._state.updated_at = time.time()
                
                # 5. Build unified payload for downstream consumers (REST/WS)
                self._latest_payload = self._build_payload(
                    calibration=self.camera.baseline.to_dict() if self.camera.baseline else None,
                    camera=camera_snapshot.to_dict(),
                    audio=audio_snapshot.to_dict(),
                    decision=decision.to_dict(),
                )

            # Wait for the next sampling interval defined in settings
            self._stop_event.wait(self.settings.camera_interval_seconds)

    def _build_payload(
        self,
        calibration: dict[str, Any] | None,
        camera: dict[str, Any] | None,
        audio: dict[str, Any] | None,
        decision: dict[str, Any] | None,
    ) -> dict[str, Any]:
        warnings = []
        warnings.extend(self.policy.warnings)
        if audio:
            warnings.extend(audio.get("warnings", []))
        if camera:
            warnings.extend(camera.get("warnings", []))

        return {
            "session": self._state.to_dict(),
            "calibration": calibration,
            "camera": camera,
            "audio": audio,
            "decision": decision,
            "warnings": sorted(set(warnings)),
        }

    @staticmethod
    def _combine_distraction(camera_distraction: int, audio_noise: int, face_detected: bool) -> int:
        distraction = max(camera_distraction, max(0, audio_noise - 1))
        if not face_detected:
            distraction = max(distraction, 3)
        return clamp_ordinal(distraction)
