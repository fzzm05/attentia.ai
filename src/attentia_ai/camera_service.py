from __future__ import annotations

import math
import os
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import numpy as np

from attentia_ai.helpers.config import Settings

_cache_root = Path(__file__).resolve().parents[2] / ".cache"
_matplotlib_cache = _cache_root / "matplotlib"
_fontconfig_cache = _cache_root / "fontconfig"
_matplotlib_cache.mkdir(parents=True, exist_ok=True)
_fontconfig_cache.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("MPLCONFIGDIR", str(_matplotlib_cache))
os.environ.setdefault("XDG_CACHE_HOME", str(_cache_root))
os.environ.setdefault("FONTCONFIG_PATH", str(_fontconfig_cache))
os.environ.setdefault("OPENCV_AVFOUNDATION_SKIP_AUTH", "1")

try:
    import cv2
except Exception:  # pragma: no cover - hardware dependency
    cv2 = None

try:
    import mediapipe as mp
    from mediapipe.tasks.python import vision
except Exception:  # pragma: no cover - hardware dependency
    mp = None
    vision = None


EMOTION_LABELS = {
    0: "neutral",
    1: "angry",
    2: "happy",
    3: "agitated",
}


@dataclass
class BaselineProfile:
    emotions: dict[str, float]
    angles: list[float]
    created_at: float

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class CameraSnapshot:
    face_detected: bool
    source: str
    emotion: int
    emotion_label: str
    distraction_hint: int
    movement_deltas: dict[str, float]
    emotion_deltas: dict[str, float]
    warnings: list[str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class CameraMonitorService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._cap = None
        self._landmarker = None
        self._baseline: BaselineProfile | None = None
        self._warnings: list[str] = []

    @property
    def baseline(self) -> BaselineProfile | None:
        return self._baseline

    @property
    def warnings(self) -> list[str]:
        return list(self._warnings)

    def start(self) -> None:
        self._warnings = []

        if cv2 is None or mp is None or vision is None:
            self._warnings.append("camera dependencies unavailable; using fallback camera state.")
            return

        if not self.settings.face_model_path.exists():
            self._warnings.append(f"missing face model at {self.settings.face_model_path}")
            return

        try:
            self._cap = cv2.VideoCapture(0)
            if not self._cap.isOpened():
                raise RuntimeError("unable to open webcam")

            options = mp.tasks.vision.FaceLandmarkerOptions(
                base_options=mp.tasks.BaseOptions(
                    model_asset_path=str(self.settings.face_model_path)
                ),
                running_mode=mp.tasks.vision.RunningMode.VIDEO,
                output_face_blendshapes=True,
                output_facial_transformation_matrixes=True,
                num_faces=1,
            )
            self._landmarker = vision.FaceLandmarker.create_from_options(options)
        except Exception as exc:  # pragma: no cover - hardware dependency
            self._warnings.append(f"camera initialization failed: {exc}")
            self.stop()

    def stop(self) -> None:
        if self._landmarker is not None:
            try:
                self._landmarker.close()
            except Exception:  # pragma: no cover - hardware dependency
                pass

        if self._cap is not None:
            try:
                self._cap.release()
            except Exception:  # pragma: no cover - hardware dependency
                pass

        if cv2 is not None:
            try:
                cv2.destroyAllWindows()
            except Exception:  # pragma: no cover - hardware dependency
                pass

        self._landmarker = None
        self._cap = None

    def calibrate(self) -> CameraSnapshot:
        result = self._capture_result()
        if result is None:
            self._baseline = BaselineProfile(
                emotions={},
                angles=[0.0, 0.0],
                created_at=time.time(),
            )
            warnings = list(self._warnings) + [
                "calibration used fallback baseline because no face sample was available."
            ]
            return CameraSnapshot(
                face_detected=False,
                source="fallback",
                emotion=0,
                emotion_label=EMOTION_LABELS[0],
                distraction_hint=0,
                movement_deltas={"pitch_deg_change": 0.0, "yaw_deg_change": 0.0},
                emotion_deltas={},
                warnings=warnings,
            )

        self._baseline = self._build_baseline(result)
        return CameraSnapshot(
            face_detected=True,
            source="camera",
            emotion=0,
            emotion_label=EMOTION_LABELS[0],
            distraction_hint=0,
            movement_deltas={"pitch_deg_change": 0.0, "yaw_deg_change": 0.0},
            emotion_deltas={},
            warnings=list(self._warnings),
        )

    def sample_against_baseline(self) -> CameraSnapshot:
        if self._baseline is None:
            warnings = list(self._warnings) + ["baseline not calibrated yet."]
            return CameraSnapshot(
                face_detected=False,
                source="fallback",
                emotion=0,
                emotion_label=EMOTION_LABELS[0],
                distraction_hint=0,
                movement_deltas={"pitch_deg_change": 0.0, "yaw_deg_change": 0.0},
                emotion_deltas={},
                warnings=warnings,
            )

        result = self._capture_result()
        if result is None:
            warnings = list(self._warnings) + ["no face detected in the latest camera sample."]
            return CameraSnapshot(
                face_detected=False,
                source="fallback",
                emotion=0,
                emotion_label=EMOTION_LABELS[0],
                distraction_hint=4,
                movement_deltas={"pitch_deg_change": 0.0, "yaw_deg_change": 0.0},
                emotion_deltas={},
                warnings=warnings,
            )

        emotion_deltas = self._compute_emotion_deltas(result, self._baseline)
        movement = self._compute_movement_deltas(result, self._baseline)
        emotion = self._infer_emotion(emotion_deltas)
        distraction_hint = self._infer_distraction_hint(movement)

        return CameraSnapshot(
            face_detected=True,
            source="camera",
            emotion=emotion,
            emotion_label=EMOTION_LABELS[emotion],
            distraction_hint=distraction_hint,
            movement_deltas=movement,
            emotion_deltas=emotion_deltas,
            warnings=list(self._warnings),
        )

    def diagnostics(self) -> dict[str, Any]:
        model_exists = self.settings.face_model_path.exists()
        dependency_ready = cv2 is not None and mp is not None and vision is not None

        status = "ready"
        permission_hint = None
        if not dependency_ready:
            status = "missing_dependency"
        elif not model_exists:
            status = "missing_model"
        elif any("unable to open webcam" in warning for warning in self._warnings):
            status = "camera_unavailable"
            permission_hint = (
                "On macOS, allow camera access for the terminal or Python process in "
                "System Settings > Privacy & Security > Camera, then restart the server."
            )

        return {
            "available": dependency_ready and model_exists,
            "status": status,
            "model_path": str(self.settings.face_model_path),
            "baseline_ready": self._baseline is not None,
            "permission_hint": permission_hint,
            "warnings": list(self._warnings),
        }

    def _capture_result(self):
        if self._cap is None or self._landmarker is None or cv2 is None or mp is None:
            return None

        ok, frame = self._cap.read()
        if not ok:
            return None

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        timestamp_ms = int(time.time() * 1000)

        result = self._landmarker.detect_for_video(mp_image, timestamp_ms)
        if result and result.face_landmarks:
            return result
        return None

    @staticmethod
    def _build_baseline(result) -> BaselineProfile:
        emotions = {b.category_name: float(b.score) for b in result.face_blendshapes[0]}
        matrix = result.facial_transformation_matrixes[0]
        pitch, yaw = CameraMonitorService._extract_euler(matrix)
        return BaselineProfile(
            emotions=emotions,
            angles=[pitch, yaw],
            created_at=time.time(),
        )

    @staticmethod
    def _extract_euler(matrix) -> tuple[float, float]:
        yaw = math.atan2(matrix[0][2], matrix[2][2])
        pitch = math.atan2(-matrix[1][2], math.sqrt(matrix[0][2] ** 2 + matrix[2][2] ** 2))
        return pitch, yaw

    @staticmethod
    def _compute_emotion_deltas(result, baseline: BaselineProfile) -> dict[str, float]:
        current = {b.category_name: float(b.score) for b in result.face_blendshapes[0]}
        deltas: dict[str, float] = {}
        for name, base_value in baseline.emotions.items():
            current_value = current.get(name, 0.0)
            denominator = base_value if base_value > 0.01 else 0.01
            deltas[f"{name}_pct_change"] = round(
                ((current_value - base_value) / denominator) * 100.0,
                2,
            )
        return deltas

    @staticmethod
    def _compute_movement_deltas(result, baseline: BaselineProfile) -> dict[str, float]:
        matrix = result.facial_transformation_matrixes[0]
        current_pitch, current_yaw = CameraMonitorService._extract_euler(matrix)
        angle_diff = np.degrees(
            np.array([current_pitch, current_yaw]) - np.array(baseline.angles)
        )
        return {
            "pitch_deg_change": round(float(angle_diff[0]), 2),
            "yaw_deg_change": round(float(angle_diff[1]), 2),
        }

    @staticmethod
    def _infer_emotion(emotion_deltas: dict[str, float]) -> int:
        def score(*keys: str) -> float:
            return sum(emotion_deltas.get(f"{key}_pct_change", 0.0) for key in keys)

        angry_score = score("browDownLeft", "browDownRight", "mouthFrownLeft", "mouthFrownRight")
        happy_score = score("mouthSmileLeft", "mouthSmileRight", "cheekSquintLeft", "cheekSquintRight")
        agitated_score = score("jawOpen", "eyeWideLeft", "eyeWideRight", "browInnerUp")

        scores = {
            0: 0.0,
            1: angry_score,
            2: happy_score,
            3: agitated_score,
        }
        winner = max(scores, key=scores.get)
        return winner if scores[winner] > 25 else 0

    @staticmethod
    def _infer_distraction_hint(movement: dict[str, float]) -> int:
        magnitude = max(abs(movement["pitch_deg_change"]), abs(movement["yaw_deg_change"]))
        if magnitude >= 30:
            return 4
        if magnitude >= 20:
            return 3
        if magnitude >= 10:
            return 2
        if magnitude >= 5:
            return 1
        return 0
