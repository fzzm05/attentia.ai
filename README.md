# attentia.ai 🧠🎧  
**Continuous Audio Monitoring & Window-Based Signal Analysis**

`attentia.ai` is a Python-based audio monitoring system designed to continuously record microphone input and analyze short time windows (7–10 seconds) of audio to detect changes in sound patterns.

The system extracts simple, interpretable audio features and compares them against recent history using percentage-based change, making it suitable for research, experimentation, and downstream ML or reinforcement-learning pipelines.

---

## ✨ Core Idea

> “What changed in the last few seconds compared to just before?”

Instead of complex models or heavy inference, `attentia.ai` focuses on:
- Temporal consistency
- Relative change
- Low-latency signal statistics

---

## 🔍 What the System Does

1. Continuously records audio from the user’s microphone  
2. Every 7–10 seconds (window), computes:
   - Average amplitude (RMS)
   - Variance of amplitude
   - Average frequency (spectral centroid)
   - Variance of frequency  
3. Maintains a queue of the last 3 windows  
4. On every new window:
   - Compares it against the mean of the previous two
   - Computes percentage difference for each metric  
5. Outputs window features and comparison results  

**Nothing more is performed at this stage:**
- ❌ No emotion inference  
- ❌ No speech detection  
- ❌ No ML models  
- ❌ No noise classification  

---

## 📁 Project Structure
ATTENTIA.AI/
│
├── src/
│ └── attentia_ai/
│ ├── audio_monitor.py
│ └── helpers/
│ ├── config.py
│ ├── dsp.py
│ ├── emotion.py
│ └── init.py
│
├── scripts/
│ └── run_audio_monitor.py
│
├── docs/
│ └── guide.md
│
├── data/
│
├── .venv/
├── requirements.txt
├── pyproject.toml
├── README.md
└── .gitignore

## 🚀 How to Run

### 1. Activate virtual environment
```bash
source .venv/bin/activate
```
### 2. Install dependencies
`pip install -r requirements.txt`
### 3. Run the audio monitor
`PYTHONPATH=src python scripts/run_audio_monitor.py`

Press Ctrl + C to stop.

## 🖥️ Dependencies

- Python 3.10+
- numpy
- sounddevice

---

## 🎯 Intended Use Cases

- Attention and focus research
- Behavioral signal analysis
- Feature generation for ML pipelines
- Reinforcement learning state inputs
- Lightweight real-time monitoring

---

## 🔮 Future Extensions

- Emotion inference models
- Speech vs noise classification
- Camera-based attention signals
- Reinforcement learning feedback loops
- Dataset logging and replay
- API / service mode
- Embedded / Raspberry Pi deployment

---