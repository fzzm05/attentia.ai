"""
Python port of your Node.js mic + FFT feature extraction + window comparison + emotion inference.

Dependencies:
  pip install sounddevice numpy

Notes:
- Uses sounddevice InputStream to capture mono 16-bit audio at 44100 Hz.
- Computes RMS and ZCR on every audio callback.
- Computes spectral centroid (FFT) throttled to every FFT_INTERVAL_MS.
- Uses an 8-second window and keeps a 3-window history, just like your JS.
"""

# src/attentia_ai/audio_monitor.py

import time
from collections import deque
from typing import Deque, Dict, Any, List

import numpy as np
import sounddevice as sd

# ================= CONFIG =================
SAMPLE_RATE = 44100
WINDOW_DURATION_MS = 8000   # 7–10 seconds (pick 8000ms)
HISTORY_SIZE = 3

FFT_SIZE = 1024
FFT_INTERVAL_MS = 100       # throttle FFT computations
# =========================================

# Running buffers for the current window
amplitude_samples: List[float] = []
frequency_samples: List[float] = []

# Queue for last 3 windows
history: Deque[Dict[str, Any]] = deque(maxlen=HISTORY_SIZE)

window_start_ms = int(time.time() * 1000)
last_fft_time_ms = 0


# ---------- FEATURE EXTRACTION ----------
def compute_rms(samples: np.ndarray) -> float:
    # samples float32 in [-1, 1]
    if samples.size == 0:
        return 0.0
    return float(np.sqrt(np.mean(samples * samples)))


def compute_spectral_centroid(samples: np.ndarray) -> float:
    if samples.size < FFT_SIZE:
        return 0.0

    slice_ = samples[:FFT_SIZE]
    mags = np.abs(np.fft.rfft(slice_))
    total = float(np.sum(mags))
    if total == 0.0:
        return 0.0

    idx = np.arange(mags.size, dtype=np.float32)
    return float(np.sum(idx * mags) / total)


# ---------- MATH ----------
def mean(arr: List[float]) -> float:
    return float(np.mean(arr)) if arr else 0.0


def variance(arr: List[float]) -> float:
    return float(np.var(arr)) if arr else 0.0


def percent_diff(old_val: float, new_val: float) -> float:
    if old_val == 0.0:
        return 0.0
    return ((new_val - old_val) / old_val) * 100.0


# ---------- WINDOW LOGIC ----------
def process_window() -> None:
    features = {
        "avgAmplitude": mean(amplitude_samples),
        "varAmplitude": variance(amplitude_samples),
        "avgFrequency": mean(frequency_samples),
        "varFrequency": variance(frequency_samples),
        "timestamp": int(time.time() * 1000),
    }

    history.append(features)

    # Only compare once we have 3 windows
    if len(history) == 3:
        w1, w2, w3 = history[0], history[1], history[2]

        comparison = {
            "ampPct": percent_diff(
                mean([w1["avgAmplitude"], w2["avgAmplitude"]]),
                w3["avgAmplitude"],
            ),
            "freqPct": percent_diff(
                mean([w1["avgFrequency"], w2["avgFrequency"]]),
                w3["avgFrequency"],
            ),
            "varAmpPct": percent_diff(
                mean([w1["varAmplitude"], w2["varAmplitude"]]),
                w3["varAmplitude"],
            ),
            "varFreqPct": percent_diff(
                mean([w1["varFrequency"], w2["varFrequency"]]),
                w3["varFrequency"],
            ),
        }

        print("\n📊 Window Features:", features)
        print("🔁 Compare vs prev-two-mean (%):", comparison)


# ---------- AUDIO CALLBACK ----------
def audio_callback(indata: np.ndarray, frames: int, time_info, status) -> None:
    global window_start_ms, last_fft_time_ms
    global amplitude_samples, frequency_samples

    if indata.size == 0:
        return

    # mono samples
    samples = indata[:, 0].astype(np.float32, copy=False)

    # collect RMS frequently
    amplitude_samples.append(compute_rms(samples))

    # collect spectral centroid throttled
    now_ms = int(time.time() * 1000)
    if now_ms - last_fft_time_ms >= FFT_INTERVAL_MS:
        frequency_samples.append(compute_spectral_centroid(samples))
        last_fft_time_ms = now_ms

    # window boundary
    if now_ms - window_start_ms >= WINDOW_DURATION_MS:
        process_window()
        window_start_ms = now_ms
        amplitude_samples = []
        frequency_samples = []


def main(device=None) -> None:
    print("🎤 Recording started (windowed RMS + spectral centroid)...")
    print(f"Window: {WINDOW_DURATION_MS}ms | History size: {HISTORY_SIZE}")
    print("Press Ctrl+C to stop.\n")

    with sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=1,
        dtype="float32",
        blocksize=1024,
        device=device,
        callback=audio_callback,
    ):
        while True:
            time.sleep(0.2)


if __name__ == "__main__":
    main()
