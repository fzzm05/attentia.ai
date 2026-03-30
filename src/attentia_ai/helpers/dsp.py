from __future__ import annotations

from collections import deque
from typing import Deque

import numpy as np


def compute_rms(samples: np.ndarray) -> float:
    if samples.size == 0:
        return 0.0
    return float(np.sqrt(np.mean(samples * samples)))


def compute_spectral_centroid(samples: np.ndarray, sample_rate: int) -> float:
    if samples.size == 0:
        return 0.0

    magnitudes = np.abs(np.fft.rfft(samples))
    total = float(np.sum(magnitudes))
    if total == 0.0:
        return 0.0

    freqs = np.fft.rfftfreq(samples.size, d=1.0 / sample_rate)
    return float(np.sum(freqs * magnitudes) / total)


def mean(values: Deque[float] | list[float]) -> float:
    if not values:
        return 0.0
    return float(np.mean(values))


def variance(values: Deque[float] | list[float]) -> float:
    if not values:
        return 0.0
    return float(np.var(values))


def clamp_ordinal(value: float, minimum: int = 0, maximum: int = 4) -> int:
    return max(minimum, min(maximum, int(round(value))))


def bounded_history(size: int) -> Deque[float]:
    return deque(maxlen=size)
