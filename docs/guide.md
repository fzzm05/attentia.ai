# Product And RL Guide

This document describes the product intent and the current discrete decision model used by the demo branch.

## Product Goal

The project aims to support a learner during study sessions by detecting possible signs of distraction or overload and recommending lightweight interventions. The operating principle is assistive adaptation rather than surveillance.

In the current branch, the system runs fully locally on a single machine:

- backend server
- placeholder frontend
- microphone processing
- camera baseline comparison
- local Q-table policy

## State Model

The integrated branch converts sensor and profile information into a discrete state that can be consumed by the RL policy.

### `emotion`

Current Q-table domain:

- `0`: neutral
- `1`: angry
- `2`: happy
- `3`: agitated / anxious

In the current implementation, camera emotion is inferred heuristically from MediaPipe blendshape deltas relative to the baseline face sample.

### `distraction`

Discrete range:

- `0` to `4`

Distraction is currently derived from a combination of:

- camera movement relative to baseline
- face availability in the current sample
- audio-derived noise level

If the face is not detected after calibration, the system increases distraction aggressively to reflect possible disengagement or sensor loss.

### `current_difficulty`

Discrete range:

- `0` to `4`

This value is currently operator-provided through the placeholder frontend.

### `gain_capability`

Discrete range:

- `0` to `4`

This value represents the learner's current capability to gain from higher difficulty or progress. It is currently operator-provided through the placeholder frontend.

## Action Model

The Q-table exposes 5 actions:

- `0`: play music
- `1`: show animation
- `2`: decrease difficulty
- `3`: increase difficulty
- `4`: do nothing

These actions are returned by the backend as labels and indices. In this branch, the frontend displays the chosen action but does not yet execute a full study experience around it.

## Q-Table Shape

The current policy file is `model/Qtablemain.npy` with shape:

```text
(4, 5, 5, 5, 5)
```

The dimensions are:

1. emotion
2. distraction
3. current difficulty
4. gain capability
5. action

When indexed with a state tuple, the model returns 5 Q-values and the backend selects the maximum-value action.

## Runtime Interpretation

The current system should be understood as:

```text
camera + microphone + operator inputs
-> discrete learner state
-> Q-table policy lookup
-> recommended intervention
```

## Important Caveats

- camera emotion inference is currently heuristic and not clinically validated
- the policy is static and pre-trained, not updated online during sessions
- sensor fallbacks are intentional so the demo remains operable even when devices fail
- this branch is for local demos and architecture integration, not clinical or production use
