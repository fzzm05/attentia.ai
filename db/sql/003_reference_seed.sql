insert into public.intervention_catalog (action, title, description)
values
  ('play_music', 'Play Music', 'Play calming or supportive audio to reduce overload or agitation.'),
  ('show_animation', 'Show Animation', 'Render a soft animation or visual cue intended to bring attention back to the study flow.'),
  ('decrease_difficulty', 'Decrease Difficulty', 'Lower the complexity of the current task or content.'),
  ('increase_difficulty', 'Increase Difficulty', 'Raise the complexity of the current task or content.'),
  ('do_nothing', 'Do Nothing', 'Preserve the current learning flow without intervention.')
on conflict (action) do update
set
  title = excluded.title,
  description = excluded.description,
  updated_at = timezone('utc', now());

comment on table public.profiles is 'Application-facing user metadata keyed by the external authentication provider UID.';
comment on table public.parent_accounts is 'Parent-specific account information linked 1:1 with profiles.';
comment on table public.children is 'Child records owned by parent accounts and used to scope sessions and analytics.';
comment on table public.sessions is 'Top-level study session records.';
comment on table public.session_state_events is 'Time-series learner state observations derived from sensors and profile state.';
comment on table public.session_action_events is 'Time-series intervention decisions made by the RL policy.';
comment on table public.session_sensor_snapshots is 'Rawer JSON payload snapshots useful for debugging and replay.';
comment on table public.child_progress_reports is 'Aggregated reports for parent/admin dashboards.';

comment on column public.sessions.baseline_payload is 'Stored calibration payload captured at session start.';
comment on column public.sessions.runtime_metadata is 'Device/runtime/environment metadata for the session.';
comment on column public.session_state_events.state_payload is 'Extensible structured payload for extra derived features.';
comment on column public.session_action_events.q_values is 'Serialized array of Q-values returned by the policy.';
comment on column public.alerts.payload is 'Extensible alert metadata.';
