# attentia.ai 🧠  
**attention.ai** is a web-based AI platform designed to help individuals with cognitive and neurodevelopmental disabilities improve focus and engagement while studying.

The platform continuously infers user attention by combining signals from:

- 📷 **Camera input** — to detect facial cues and emotional states  
- 🎤 **Microphone input** — to detect disturbances, background noise, and audio patterns  

These multimodal signals are processed by a **custom reinforcement learning (RL) model**, which evaluates whether the user is focused or distracted in real time.

Based on the inferred state, the system dynamically:
- Identifies the type and level of distraction  
- Determines whether attention has drifted  
- Prompts the user with adaptive interventions  
- Suggests changes in study behavior or environment  

The goal is not surveillance, but supportive guidance — helping users gently re-orient their attention in a way that is personalized, explainable, and non-intrusive.

## Goal

To provide an accessible, intelligent, and adaptive focus-assistance system that empowers individuals with cognitive disabilities to study more effectively and independently.


## 📁 Project Structure

```text
ATTENTIA.AI/
├── data/                    # Local data storage (ignored by git)
├── docs/                    # Documentation files
│   └── guide.md
├── scripts/                 # Entry point scripts for execution
│   └── run_audio_monitor.py
├── src/                     # Main source code directory
│   └── attentia_ai/
│       ├── helpers/         # Utility and processing modules
│       │   ├── __init__.py
│       │   ├── config.py
│       │   ├── dsp.py
│       │   └── emotion.py
│       ├── __init__.py
│       └── audio_monitor.py
├── .gitignore               # Files to exclude from version control
├── pyproject.toml           # Build system and project metadata
├── README.md                # Project overview and instructions
└── requirements.txt         # List of dependencies
```        

## 🚀 How to Run

### 1. Activate virtual environment
```bash
source .venv/bin/activate
```
### 2. Install dependencies
```bash
source pip install -r requirements.txt
```
### 3. Run the audio monitor
```bash
source PYTHONPATH=src python scripts/run_audio_monitor.py
```

Press Ctrl + C to stop.

## Dependencies (so far)

- Python 3.10+
- numpy
- sounddevice

## Intended Use Cases

- Attention and focus research
- Behavioral signal analysis
- Feature generation for ML pipelines
- Reinforcement learning state inputs
- Lightweight real-time monitoring

## Future Extensions

- Emotion inference models
- Speech vs noise classification
- Camera-based attention signals
- Reinforcement learning feedback loops
- Dataset logging and replay
- API / service mode
- Embedded / Raspberry Pi deployment