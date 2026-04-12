# Realtime Study Platform Plan

This document defines the deployed web-platform direction for `attentia.ai`.

## Deployment Direction

The deployed system is no longer based on Python directly owning the child's local
camera and microphone.

Instead:

```text
Child Browser
  -> captures camera + microphone
  -> sends sensor packets to Python realtime engine

Python Realtime Engine
  -> performs calibration
  -> computes learner state
  -> selects interventions
  -> writes durable events into Postgres
  -> emits live websocket updates

Next.js Platform
  -> handles auth, parent/admin surfaces, and study UI
  -> launches sessions
  -> renders calibration and intervention state
  -> listens to websocket updates
```

## Why This Is Different From The Local Demo

The current Python demo assumes the Python process can open the machine's hardware
directly with local device APIs.

That works for:

- local demos
- development on a single machine
- tightly controlled local testing

It does not work for a deployed website where the child is accessing the product
from a normal browser. In the deployed model, the browser is the capture surface.

## Session Lifecycle

### 1. Parent Launch

- parent logs in
- parent opens a child record
- parent clicks `Start study session`
- Next.js creates a `sessions` row with `status = pending`

### 2. Browser Preflight

The child study page:

- requests camera permission
- requests microphone permission
- opens a websocket connection to the Python engine
- enters `awaiting_calibration`

### 3. Calibration

The browser sends calibration-control messages and sensor packets.

The Python engine:

- receives sensor packets for the `session_id`
- creates a baseline
- validates device readiness
- returns a calibration result

### 4. Active Session

During the session:

- browser continues sending sensor packets
- Python emits learner-state updates and interventions
- Python persists state/action events and snapshots to Postgres
- frontend reacts in real time

### 5. Stop / Finalize

When the session stops:

- Python emits a final status
- `sessions.status` moves to `completed`, `stopped`, or `failed`
- summary fields are updated in `sessions`

## Browser -> Python Contract

The browser should send two categories of messages:

### Control Messages

- `begin_calibration`
- `stop_session`

### Sensor Messages

- `sensor_packet`

The current TypeScript source of truth is:

- [types.ts](/Users/farooqueazam/Desktop/attentia.ai/web/src/lib/realtime/types.ts)

## Python -> Frontend Contract

The Python engine should emit:

- `session_status`
- `calibration_result`
- `state_update`
- `intervention`
- `warning`

These are also defined in:

- [types.ts](/Users/farooqueazam/Desktop/attentia.ai/web/src/lib/realtime/types.ts)

## Data Persistence Responsibilities

Python should be the main writer for live session outcomes:

- `sessions`
- `session_state_events`
- `session_action_events`
- `session_sensor_snapshots`
- `alerts` when needed

Next.js should remain the main writer for product-side setup:

- `profiles`
- `parent_accounts`
- `children`
- `child_profiles`
- session launch records

## Near-Term Build Plan

### Phase 1

- child study route in Next.js
- session launcher in the parent/admin experience
- explicit websocket contract
- browser permission and calibration UI

### Phase 2

- Python websocket server for session streams
- browser sensor packet transmission
- session status updates from Python
- persisted state/action events

The websocket transport is now scaffolded in the Flask backend at:

- [server.py](/Users/farooqueazam/Desktop/attentia.ai/src/attentia_ai/server.py)
- [realtime_engine.py](/Users/farooqueazam/Desktop/attentia.ai/src/attentia_ai/realtime_engine.py)

The current live implementation sends real browser-derived audio features and
captured video frames to Python over websocket. The backend performs session-phase
handling and RL action selection on those incoming packets. It is intentionally a
bridge architecture, not yet the final production sensing pipeline.

### Phase 3

- real lesson/activity UI in the study canvas
- intervention rendering and adaptation behavior
- parent live-observation views
- reporting and replay improvements
