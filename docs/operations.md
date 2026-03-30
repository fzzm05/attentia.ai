# Operations Guide

This document covers setup, runtime behavior, troubleshooting, and demo readiness.

## Supported Execution Model

The current branch is designed to run locally on a developer laptop.

It assumes:

- Python virtual environment
- local camera and microphone access
- local browser access to `127.0.0.1`

## Setup

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

## Demo Readiness Checklist

Before presenting:

1. confirm `GET /api/preflight` reports the Q-table as loaded
2. confirm microphone permissions are granted
3. confirm camera permissions are granted to the terminal or Python process
4. confirm `scripts/face_landmarker.task` exists
5. open the frontend and review the readiness banner
6. run one short session-start test

## macOS Camera Permissions

If the camera is blocked, the backend will continue to run but will use fallback camera state.

Typical fix:

1. open `System Settings`
2. go to `Privacy & Security`
3. open `Camera`
4. allow access for the terminal app or Python host you use to launch the backend
5. restart the server

## Troubleshooting

### `python: command not found`

Use `python3` on macOS/Linux.

### `pip: command not found`

Activate the virtual environment first, or use `python -m pip`.

### Camera starts in fallback mode

Check:

- OS permissions
- webcam availability
- whether another app is already using the camera
- whether OpenCV initialized the device successfully

### Microphone starts in fallback mode

Check:

- OS permissions
- microphone availability
- whether another app is exclusively using the input device

### Frontend loads but values do not update

Check:

- the backend process is still running
- `PYTHONPATH=src` was set before launch
- `GET /api/status` returns JSON

### Dependency installation issues

This project depends on libraries such as:

- Flask
- NumPy
- OpenCV
- MediaPipe
- sounddevice

If a machine has version-specific issues, the first diagnostic step should be to verify:

- Python version
- virtualenv activation
- successful `pip install -r requirements.txt`

## Operational Caveats

- this is a demo application, not a production service
- there is no authentication layer in the current branch
- there is no persistence layer for session history
- warnings are surfaced through API responses rather than structured logging infrastructure
- device behavior can differ by laptop, OS, and driver stack

## Recommended Team Workflow

When another teammate pulls the branch:

1. fetch and checkout the demo branch
2. create a local virtual environment
3. install requirements
4. run the server
5. verify preflight
6. verify a short session start/stop flow

This minimizes last-minute surprises across machines.
