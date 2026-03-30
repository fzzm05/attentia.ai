# attentia.ai

`attentia.ai` is a local-first adaptive study assistant prototype for children who may benefit from gentle attention support during learning sessions. The system combines microphone input, camera-derived baseline comparison, and a reinforcement-learning policy to estimate learner state and recommend interventions such as music, animation, or difficulty changes.

This branch contains a self-contained demo stack:

- a local Flask backend
- a placeholder browser frontend
- microphone feature capture
- camera baseline and periodic comparison
- a pre-trained NumPy Q-table for action selection

The current implementation is intended for local demos, architecture validation, and model integration work. It is not a production deployment.

## What This Branch Does

When the server starts, it serves a local frontend on `http://127.0.0.1:8000`.

When a session is started from the frontend:

1. the backend starts the microphone monitor
2. the backend attempts to initialize the camera pipeline
3. the camera pipeline calibrates a baseline face state for the learner
4. every 5 seconds, the backend samples camera state against that baseline
5. the backend continuously aggregates microphone features into a noise signal
6. the backend converts sensor outputs into discrete state values
7. the RL Q-table selects the best action for that state
8. the frontend displays the live state and selected action

If a device is unavailable, the system falls back gracefully and surfaces warnings through the API and frontend preflight banner.

## Repository Structure

```text
attentia.ai/
├── docs/
│   ├── api.md
│   ├── architecture.md
│   ├── guide.md
│   └── operations.md
├── frontend/
│   └── index.html
├── model/
│   └── Qtablemain.npy
├── scripts/
│   ├── BaselineClass.py
│   ├── cameraAccessClass.py
│   ├── face_landmarker.task
│   ├── run_audio_monitor.py
│   └── run_server.py
├── src/
│   └── attentia_ai/
│       ├── helpers/
│       │   ├── config.py
│       │   └── dsp.py
│       ├── audio_monitor.py
│       ├── audio_service.py
│       ├── camera_service.py
│       ├── rl_policy.py
│       ├── server.py
│       └── session.py
├── .gitignore
├── pyproject.toml
├── requirements.txt
└── README.md
```

## Core Components

### Backend

- `src/attentia_ai/server.py`
  exposes the local HTTP server and API routes
- `src/attentia_ai/session.py`
  owns runtime session state, orchestration, and the 5-second decision loop

### Sensor Services

- `src/attentia_ai/audio_service.py`
  captures microphone samples and derives RMS, spectral centroid, and a discrete noise level
- `src/attentia_ai/camera_service.py`
  initializes MediaPipe face tracking, stores a baseline snapshot, and compares later samples to that baseline

### Decision Layer

- `src/attentia_ai/rl_policy.py`
  loads the Q-table from `model/Qtablemain.npy` and selects the highest-value action

### Frontend

- `frontend/index.html`
  is a minimal operator-facing demo UI that starts and stops sessions, updates learner profile fields, and renders the live backend payload

### Legacy / Prototype Files

- `scripts/BaselineClass.py`
  original standalone baseline comparison logic
- `scripts/cameraAccessClass.py`
  original standalone camera access implementation
- `src/attentia_ai/audio_monitor.py`
  earlier standalone audio-monitor prototype

These files are useful reference material but are not the main runtime entrypoint for the integrated demo.

## Installation

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export PYTHONPATH=src
python scripts/run_server.py
```

### Windows Command Prompt

```bat
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
set PYTHONPATH=src
python scripts/run_server.py
```

Then open:

```text
http://127.0.0.1:8000
```

## Demo Workflow

1. Start the server.
2. Open the frontend.
3. Review the preflight banner to confirm Q-table, microphone, and camera readiness.
4. Set `difficulty` and `gain_capability` if needed.
5. Click `Start Session`.
6. Let the backend calibrate and begin the periodic loop.
7. Watch the frontend update with:
   - current emotion
   - distraction level
   - noise level
   - selected RL action
   - raw API payload

## Permissions and Platform Notes

- On macOS, camera access must be granted to the terminal or Python process running the backend.
- Microphone permissions may also need to be granted on first use.
- OpenCV and MediaPipe behavior may vary slightly by OS and Python version.
- The frontend itself does not access the camera or microphone directly in this branch; the backend does.

## Current Constraints

- the RL model is a static Q-table, not an online-learning agent
- the camera emotion mapping is heuristic and intended for demo use
- fallback states are used when hardware is unavailable
- the frontend is intentionally minimal and operator-oriented

## Documentation Map

- `docs/architecture.md`
  system architecture, runtime modules, and integration boundaries
- `docs/api.md`
  backend routes and payload contracts
- `docs/guide.md`
  product and RL state/action model
- `docs/operations.md`
  setup, environment, permissions, troubleshooting, and demo checklist

## Intended Next Steps

- integrate the final frontend experience
- refine camera-state classification with validated model logic
- make distraction encoding more rigorous and explainable
- add persistent session logging
- add automated tests around state encoding and action selection
- formalize deployment and packaging strategy
