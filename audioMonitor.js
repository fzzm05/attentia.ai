import mic from "mic";
import fftjs from "fft-js";

const { fft, util: fftUtil } = fftjs;

// ================= CONFIG =================
const SAMPLE_RATE = 44100;
const WINDOW_DURATION_MS = 8000; // 7–10 seconds
const HISTORY_SIZE = 3;

const FFT_INTERVAL_MS = 100; // throttle FFT
const FFT_SIZE = 1024;
// =========================================

// -------- CHILD PARAMETERS (KNOWN TO MODEL) ----------
const emotionalRigidity = 0.3; // 0–1
let distraction = 1; // 0–4
// ----------------------------------------------------

let amplitudeSamples = [];
let frequencySamples = [];
let zcrSamples = [];
let historyQueue = [];

let windowStart = Date.now();
let lastFFTTime = 0;

// ---------- MIC SETUP ----------
const micInstance = mic({
  rate: String(SAMPLE_RATE),
  channels: "1",
  bitwidth: "16",
  encoding: "signed-integer",
  endian: "little",
  device: "default"
});

const micInputStream = micInstance.getAudioStream();

micInputStream.on("data", buffer => processAudioBuffer(buffer));
micInputStream.on("error", err => console.error("Mic error:", err));

micInstance.start();
console.log("🎤 Recording started (optimized + emotion inference)...");

// ---------- AUDIO PROCESSING ----------
function processAudioBuffer(buffer) {
  const samples = bufferToSamples(buffer);
  if (!samples.length) return;

  // RMS (cheap)
  amplitudeSamples.push(computeRMS(samples));

  // ZCR (cheap)
  zcrSamples.push(computeZCR(samples));

  // FFT (throttled)
  const now = Date.now();
  if (now - lastFFTTime >= FFT_INTERVAL_MS) {
    frequencySamples.push(computeSpectralCentroid(samples));
    lastFFTTime = now;
  }

  // Window boundary
  if (now - windowStart >= WINDOW_DURATION_MS) {
    processWindow();
    windowStart = now;
    amplitudeSamples = [];
    frequencySamples = [];
    zcrSamples = [];
  }
}

// ---------- WINDOW PROCESSING ----------
function processWindow() {
  const features = {
    avgAmplitude: mean(amplitudeSamples),
    varAmplitude: variance(amplitudeSamples),
    avgFrequency: mean(frequencySamples),
    varFrequency: variance(frequencySamples),
    avgZCR: mean(zcrSamples),
    timestamp: Date.now()
  };

  historyQueue.push(features);
  if (historyQueue.length > HISTORY_SIZE) historyQueue.shift();

  if (historyQueue.length === 3) {
    const [w1, w2, w3] = historyQueue;

    const comparison = compareWindows(w1, w2, w3);
    const noiseLevel = classifyNoise(comparison);
    const audioContext = classifyAudioContext(features);

    const emotion = inferEmotion({
      noiseLevel,
      audioContext,
      distraction,
      emotionalRigidity
    });

    console.log("\n📊 Window Features:", features);
    console.log("🔍 Noise Metrics:", comparison);
    console.log("🔊 Audio Context:", audioContext);
    console.log("📌 Noise Level:", noiseLevel);
    console.log("🧠 Emotion Probabilities:", emotion);
  }
}

// ---------- FEATURE EXTRACTION ----------
function bufferToSamples(buffer) {
  const samples = new Float32Array(buffer.length / 2);
  let idx = 0;
  for (let i = 0; i < buffer.length; i += 2) {
    samples[idx++] = buffer.readInt16LE(i) / 32768;
  }
  return samples;
}

function computeRMS(samples) {
  let sum = 0;
  for (const s of samples) sum += s * s;
  return Math.sqrt(sum / samples.length);
}

function computeZCR(samples) {
  let crossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i - 1] >= 0 && samples[i] < 0) ||
        (samples[i - 1] < 0 && samples[i] >= 0)) {
      crossings++;
    }
  }
  return crossings / samples.length;
}

function computeSpectralCentroid(samples) {
  if (samples.length < FFT_SIZE) return 0;

  const slice = samples.subarray(0, FFT_SIZE);
  const phasors = fft(slice);
  const mags = fftUtil.fftMag(phasors);

  let weightedSum = 0;
  let total = 0;
  for (let i = 0; i < mags.length; i++) {
    weightedSum += i * mags[i];
    total += mags[i];
  }
  return total === 0 ? 0 : weightedSum / total;
}

// ---------- COMPARISON ----------
function compareWindows(w1, w2, w3) {
  return {
    ampPct: percentDiff(mean([w1.avgAmplitude, w2.avgAmplitude]), w3.avgAmplitude),
    freqPct: percentDiff(mean([w1.avgFrequency, w2.avgFrequency]), w3.avgFrequency),
    varAmpPct: percentDiff(mean([w1.varAmplitude, w2.varAmplitude]), w3.varAmplitude),
    varFreqPct: percentDiff(mean([w1.varFrequency, w2.varFrequency]), w3.varFrequency)
  };
}

// ---------- NOISE CLASSIFICATION ----------
function classifyNoise({ ampPct, freqPct }) {
  if (Math.abs(ampPct) < 10 && Math.abs(freqPct) < 10) return 0;
  if (Math.abs(ampPct) < 30 || Math.abs(freqPct) < 30) return 1;
  return 2;
}

// ---------- SPEECH vs AGITATION ----------
function classifyAudioContext({ varAmplitude, varFrequency, avgZCR }) {
  if (varAmplitude > 0.002 && varFrequency > 150 && avgZCR > 0.15)
    return "agitation_noise";

  if (avgZCR < 0.12 && varAmplitude < 0.002)
    return "speech_or_normal";

  return "uncertain";
}

// ---------- EMOTION INFERENCE ----------
function inferEmotion({ noiseLevel, audioContext, distraction, emotionalRigidity }) {
  let probs = [0.4, 0.1, 0.2, 0.1, 0.2]; // neutral bias

  if (noiseLevel === 1) {
    probs[4] += 0.15;
    probs[3] += 0.05;
  }

  if (noiseLevel === 2) {
    probs[4] += 0.3;
    probs[1] += 0.15;
  }

  if (audioContext === "agitation_noise") {
    probs[4] += 0.2;
  }

  if (distraction >= 3) {
    probs[3] += 0.1;
    probs[4] += 0.1;
  }

  // Emotional rigidity dampening
  for (let i = 0; i < probs.length; i++) {
    probs[i] = probs[i] * (1 - emotionalRigidity) + 0.2 * emotionalRigidity;
  }

  probs = normalize(probs);

  return {
    neutral: probs[0],
    angry: probs[1],
    happy: probs[2],
    sad: probs[3],
    anxious: probs[4]
  };
}

// ---------- MATH ----------
function mean(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function variance(arr) {
  const m = mean(arr);
  return mean(arr.map(x => (x - m) ** 2));
}

function percentDiff(oldVal, newVal) {
  if (oldVal === 0) return 0;
  return ((newVal - oldVal) / oldVal) * 100;
}

function normalize(arr) {
  const sum = arr.reduce((a, b) => a + b, 0);
  return arr.map(v => v / sum);
}
