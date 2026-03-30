from __future__ import annotations

import threading
from collections import deque
from dataclasses import asdict, dataclass
from typing import Any

import numpy as np

from attentia_ai.helpers.config import Settings
from attentia_ai.helpers.dsp import compute_rms, compute_spectral_centroid, mean, variance

try:
    import sounddevice as sd
except Exception:  # pragma: no cover - hardware dependency
    sd = None


@dataclass
class AudioSnapshot:
    running: bool
    source: str
    avg_rms: float
    rms_variance: float
    avg_centroid: float
    noise_level: int
    warnings: list[str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class AudioMonitorService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._lock = threading.Lock()
        history_size = max(10, int(settings.audio_window_seconds * 4))
        self._rms_history = deque(maxlen=history_size)
        self._centroid_history = deque(maxlen=history_size)
        self._stream = None
        self._running = False
        self._warnings: list[str] = []

    def start(self) -> None:
        if self._running:
            return

        self._warnings = []
        if sd is None:
            self._warnings.append("sounddevice is unavailable; using silent audio fallback.")
            return

        try:
            self._stream = sd.InputStream(
                samplerate=self.settings.audio_sample_rate,
                channels=1,
                dtype="float32",
                blocksize=self.settings.audio_block_size,
                callback=self._audio_callback,
            )
            self._stream.start()
            self._running = True
        except Exception as exc:  # pragma: no cover - hardware dependency
            self._warnings.append(f"microphone unavailable: {exc}")
            self._stream = None
            self._running = False

    def stop(self) -> None:
        if self._stream is not None:
            try:
                self._stream.stop()
                self._stream.close()
            except Exception:  # pragma: no cover - hardware dependency
                pass

        self._stream = None
        self._running = False

    def snapshot(self) -> AudioSnapshot:
        with self._lock:
            avg_rms = mean(self._rms_history)
            rms_var = variance(self._rms_history)
            avg_centroid = mean(self._centroid_history)

        noise_level = self._classify_noise(avg_rms, rms_var, avg_centroid)
        source = "microphone" if self._running else "fallback"
        return AudioSnapshot(
            running=self._running,
            source=source,
            avg_rms=avg_rms,
            rms_variance=rms_var,
            avg_centroid=avg_centroid,
            noise_level=noise_level,
            warnings=list(self._warnings),
        )

    def diagnostics(self) -> dict[str, Any]:
        return {
            "available": sd is not None,
            "running": self._running,
            "status": "ready" if sd is not None else "missing_dependency",
            "warnings": list(self._warnings),
        }

    def _audio_callback(self, indata, frames, time_info, status) -> None:  # pragma: no cover - hardware dependency
        if indata is None or len(indata) == 0:
            return

        samples = np.asarray(indata[:, 0], dtype=np.float32)
        rms = compute_rms(samples)
        centroid = compute_spectral_centroid(samples, self.settings.audio_sample_rate)

        with self._lock:
            self._rms_history.append(rms)
            self._centroid_history.append(centroid)

    @staticmethod
    def _classify_noise(avg_rms: float, rms_var: float, avg_centroid: float) -> int:
        score = 0

        if avg_rms >= 0.02:
            score += 1
        if avg_rms >= 0.05:
            score += 1
        if avg_rms >= 0.10:
            score += 1
        if rms_var >= 0.001:
            score += 1
        if avg_centroid >= 1800:
            score += 1

        return max(0, min(4, score))
