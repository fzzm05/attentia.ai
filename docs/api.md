# API Reference

This document describes the HTTP interface exposed by the local demo backend.

Base URL:

```text
http://127.0.0.1:8000
```

## `GET /`

Serves the placeholder frontend.

## `GET /api/status`

Returns the latest session payload.

Example response shape:

```json
{
  "session": {
    "running": true,
    "calibrated": true,
    "difficulty": 2,
    "gain_capability": 2,
    "emotion": 0,
    "distraction": 4,
    "current_action": 1,
    "current_action_label": "show_animation",
    "updated_at": 1774892968.764606
  },
  "calibration": {},
  "camera": {},
  "audio": {},
  "decision": {},
  "warnings": []
}
```

Important fields:

- `session`
  authoritative runtime state
- `calibration`
  baseline information from the current session
- `camera`
  latest camera snapshot
- `audio`
  latest audio snapshot
- `decision`
  selected RL action and Q-values
- `warnings`
  normalized warning messages across services

## `GET /api/preflight`

Returns readiness and environment diagnostics.

Example response shape:

```json
{
  "ready": true,
  "camera": {
    "available": true,
    "status": "ready",
    "baseline_ready": false,
    "permission_hint": null,
    "warnings": []
  },
  "audio": {
    "available": true,
    "running": false,
    "status": "ready",
    "warnings": []
  },
  "policy": {
    "loaded": true,
    "status": "ready",
    "shape": [4, 5, 5, 5, 5],
    "warnings": []
  },
  "issues": []
}
```

This endpoint is intended for:

- demo checks before presenting
- hardware readiness validation
- surfacing camera permission problems

## `POST /api/session/start`

Starts the session lifecycle.

Behavior:

- starts audio monitoring
- attempts camera initialization
- runs calibration
- starts the periodic decision loop

Returns the initial session payload after startup.

## `POST /api/session/stop`

Stops the session lifecycle.

Behavior:

- stops the background loop
- stops microphone streaming
- releases camera resources
- resets session action state to idle

Returns the final idle payload.

## `POST /api/session/profile`

Updates operator-provided state values.

Request body:

```json
{
  "difficulty": 2,
  "gain_capability": 2
}
```

Behavior:

- clamps values to the `0..4` range
- updates session state used by the RL policy

## Error Handling Philosophy

The backend is designed to degrade gracefully rather than fail hard.

Examples:

- camera unavailable -> fallback camera snapshot and warnings
- microphone unavailable -> fallback audio source and warnings
- missing Q-table -> fallback `do_nothing` policy

This makes the demo more resilient during local setup and presentation scenarios.
