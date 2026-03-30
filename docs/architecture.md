# Architecture

This document describes the integrated runtime architecture for the local demo branch.

## System Overview

The project is organized as a local-first, layered application:

```text
Frontend
  -> HTTP API
    -> Session Orchestrator
      -> Audio Service
      -> Camera Service
      -> RL Policy
```

Everything runs on the same machine in the current branch.

## Runtime Layers

### 1. Presentation Layer

File:

- `frontend/index.html`

Responsibilities:

- starts and stops the study session
- updates profile values such as difficulty and gain capability
- polls backend state
- renders diagnostics and the latest action recommendation

This layer is intentionally thin and acts as a placeholder until the final study interface is integrated.

### 2. Transport Layer

File:

- `src/attentia_ai/server.py`

Responsibilities:

- initializes Flask
- creates the session manager
- serves the frontend
- exposes REST endpoints for status, preflight, and session control

### 3. Application Orchestration Layer

File:

- `src/attentia_ai/session.py`

Responsibilities:

- owns session lifecycle
- coordinates startup and shutdown
- performs calibration
- runs the periodic camera/RL loop
- merges sensor outputs into a single session payload

This is the primary integration boundary of the system.

### 4. Sensor Layer

Files:

- `src/attentia_ai/audio_service.py`
- `src/attentia_ai/camera_service.py`

Responsibilities:

- collect hardware input
- extract features
- return normalized snapshots for downstream consumers
- report warnings and fallback states when devices are unavailable

#### Audio Service

Uses:

- `sounddevice`
- NumPy-based feature extraction

Outputs:

- average RMS
- RMS variance
- spectral centroid
- discrete noise level

#### Camera Service

Uses:

- OpenCV
- MediaPipe Face Landmarker
- local baseline snapshot logic

Outputs:

- face detection status
- camera-vs-baseline movement deltas
- blendshape percentage deltas
- heuristic emotion classification
- distraction hint

### 5. Decision Layer

File:

- `src/attentia_ai/rl_policy.py`

Responsibilities:

- load the Q-table
- resolve the current state into Q-values
- select the maximum-value action

## Runtime Sequence

### Session Start

1. frontend calls `POST /api/session/start`
2. session manager starts audio service
3. session manager starts camera service
4. camera service attempts calibration and stores a baseline
5. session manager marks the session as running
6. background loop begins

### Decision Cycle

Every `camera_interval_seconds`:

1. camera service samples against the baseline
2. audio service provides the latest aggregated snapshot
3. session manager combines those into discrete state values
4. RL policy returns Q-values and selected action
5. session payload is updated
6. frontend polling reflects the latest state

### Session Stop

1. frontend calls `POST /api/session/stop`
2. background loop exits
3. audio stream is closed
4. camera resources are released
5. session state resets to idle

## Integration Boundaries

The integrated design is intentionally modular:

- the frontend does not need to know sensor implementation details
- the RL policy does not depend on hardware libraries
- services expose structured snapshots rather than raw device data
- hardware failure does not take down the HTTP server

This makes it easier to replace:

- the placeholder frontend with a real study product
- the heuristic camera emotion mapper with a trained model
- the static Q-table with another policy implementation

## Legacy Files

The repo still contains earlier standalone prototype code:

- `scripts/BaselineClass.py`
- `scripts/cameraAccessClass.py`
- `src/attentia_ai/audio_monitor.py`

These are useful references and informed the integrated services, but they are not the main entry path for the local demo branch.
