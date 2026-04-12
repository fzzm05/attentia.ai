create extension if not exists pgcrypto;
create extension if not exists citext;

create schema if not exists app_private;

create type public.app_role as enum ('platform_admin', 'parent');
create type public.child_status as enum ('active', 'inactive', 'archived');
create type public.session_status as enum ('pending', 'running', 'completed', 'stopped', 'failed');
create type public.sensor_source as enum ('camera', 'microphone', 'fallback', 'simulated', 'unknown');
create type public.emotion_state as enum ('neutral', 'angry', 'happy', 'agitated');
create type public.intervention_action as enum (
  'play_music',
  'show_animation',
  'decrease_difficulty',
  'increase_difficulty',
  'do_nothing'
);
create type public.alert_type as enum (
  'session_started',
  'session_stopped',
  'high_distraction',
  'sensor_failure',
  'manual_note'
);
create type public.report_period as enum ('daily', 'weekly', 'monthly');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.enum_emotion_to_code(value public.emotion_state)
returns smallint
language sql
immutable
as $$
  select case value
    when 'neutral' then 0
    when 'angry' then 1
    when 'happy' then 2
    when 'agitated' then 3
  end::smallint
$$;

create or replace function public.enum_action_to_code(value public.intervention_action)
returns smallint
language sql
immutable
as $$
  select case value
    when 'play_music' then 0
    when 'show_animation' then 1
    when 'decrease_difficulty' then 2
    when 'increase_difficulty' then 3
    when 'do_nothing' then 4
  end::smallint
$$;

create table if not exists public.profiles (
  id text primary key,
  email citext unique,
  full_name text not null,
  role public.app_role not null default 'parent',
  avatar_url text,
  phone text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create table if not exists public.parent_accounts (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null unique references public.profiles(id) on delete cascade,
  onboarding_completed boolean not null default false,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger parent_accounts_set_updated_at
before update on public.parent_accounts
for each row
execute function public.set_updated_at();

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  parent_account_id uuid not null references public.parent_accounts(id) on delete cascade,
  full_name text not null,
  preferred_name text,
  date_of_birth date,
  status public.child_status not null default 'active',
  notes text,
  baseline_difficulty smallint not null default 2 check (baseline_difficulty between 0 and 4),
  baseline_gain_capability smallint not null default 2 check (baseline_gain_capability between 0 and 4),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists children_parent_account_id_idx
on public.children(parent_account_id);

create index if not exists children_status_idx
on public.children(status);

create trigger children_set_updated_at
before update on public.children
for each row
execute function public.set_updated_at();

create table if not exists public.child_profiles (
  child_id uuid primary key references public.children(id) on delete cascade,
  sensory_notes text,
  learning_notes text,
  medical_notes text,
  preferred_interventions text[] not null default '{}',
  avoided_interventions text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger child_profiles_set_updated_at
before update on public.child_profiles
for each row
execute function public.set_updated_at();

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references public.children(id) on delete set null,
  device_label text not null,
  device_type text not null,
  os_name text,
  os_version text,
  app_version text,
  last_seen_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists devices_child_id_idx
on public.devices(child_id);

create trigger devices_set_updated_at
before update on public.devices
for each row
execute function public.set_updated_at();

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  status public.session_status not null default 'pending',
  started_at timestamptz,
  ended_at timestamptz,
  baseline_calibrated boolean not null default false,
  baseline_payload jsonb not null default '{}'::jsonb,
  q_table_version text,
  runtime_metadata jsonb not null default '{}'::jsonb,
  summary_emotion public.emotion_state,
  summary_distraction smallint check (summary_distraction between 0 and 4),
  summary_noise_level smallint check (summary_noise_level between 0 and 4),
  summary_action public.intervention_action,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (ended_at is null or started_at is null or ended_at >= started_at)
);

create index if not exists sessions_child_id_idx
on public.sessions(child_id);

create index if not exists sessions_status_idx
on public.sessions(status);

create index if not exists sessions_started_at_desc_idx
on public.sessions(started_at desc nulls last);

create index if not exists sessions_child_started_at_desc_idx
on public.sessions(child_id, started_at desc nulls last);

create trigger sessions_set_updated_at
before update on public.sessions
for each row
execute function public.set_updated_at();

create table if not exists public.session_state_events (
  id bigserial primary key,
  session_id uuid not null references public.sessions(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  recorded_at timestamptz not null default timezone('utc', now()),
  emotion public.emotion_state not null,
  emotion_code smallint generated always as (public.enum_emotion_to_code(emotion)) stored,
  distraction smallint not null check (distraction between 0 and 4),
  current_difficulty smallint not null check (current_difficulty between 0 and 4),
  gain_capability smallint not null check (gain_capability between 0 and 4),
  noise_level smallint not null check (noise_level between 0 and 4),
  camera_source public.sensor_source not null default 'unknown',
  audio_source public.sensor_source not null default 'unknown',
  face_detected boolean,
  state_payload jsonb not null default '{}'::jsonb
);

create index if not exists session_state_events_session_time_idx
on public.session_state_events(session_id, recorded_at desc);

create index if not exists session_state_events_child_time_idx
on public.session_state_events(child_id, recorded_at desc);

create index if not exists session_state_events_recorded_brin_idx
on public.session_state_events using brin(recorded_at);

create table if not exists public.session_action_events (
  id bigserial primary key,
  session_id uuid not null references public.sessions(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  recorded_at timestamptz not null default timezone('utc', now()),
  action public.intervention_action not null,
  action_code smallint generated always as (public.enum_action_to_code(action)) stored,
  decision_source text not null default 'q_table',
  q_values jsonb not null default '[]'::jsonb,
  policy_payload jsonb not null default '{}'::jsonb
);

create index if not exists session_action_events_session_time_idx
on public.session_action_events(session_id, recorded_at desc);

create index if not exists session_action_events_child_time_idx
on public.session_action_events(child_id, recorded_at desc);

create index if not exists session_action_events_recorded_brin_idx
on public.session_action_events using brin(recorded_at);

create table if not exists public.session_sensor_snapshots (
  id bigserial primary key,
  session_id uuid not null references public.sessions(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  recorded_at timestamptz not null default timezone('utc', now()),
  audio_payload jsonb not null default '{}'::jsonb,
  camera_payload jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb
);

create index if not exists session_sensor_snapshots_session_time_idx
on public.session_sensor_snapshots(session_id, recorded_at desc);

create index if not exists session_sensor_snapshots_child_time_idx
on public.session_sensor_snapshots(child_id, recorded_at desc);

create index if not exists session_sensor_snapshots_recorded_brin_idx
on public.session_sensor_snapshots using brin(recorded_at);

create table if not exists public.intervention_catalog (
  action public.intervention_action primary key,
  title text not null,
  description text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger intervention_catalog_set_updated_at
before update on public.intervention_catalog
for each row
execute function public.set_updated_at();

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete cascade,
  type public.alert_type not null,
  title text not null,
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  acknowledged_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists alerts_child_created_at_idx
on public.alerts(child_id, created_at desc);

create table if not exists public.child_progress_reports (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  period public.report_period not null,
  period_start date not null,
  period_end date not null,
  session_count integer not null default 0,
  avg_distraction numeric(6,3),
  avg_noise_level numeric(6,3),
  dominant_emotion public.emotion_state,
  dominant_action public.intervention_action,
  total_interventions integer not null default 0,
  report_payload jsonb not null default '{}'::jsonb,
  summary text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (child_id, period, period_start, period_end)
);

create index if not exists child_progress_reports_child_period_idx
on public.child_progress_reports(child_id, period, period_start desc);

create table if not exists public.audit_logs (
  id bigserial primary key,
  actor_profile_id text references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_logs_actor_created_at_idx
on public.audit_logs(actor_profile_id, created_at desc);

create index if not exists audit_logs_entity_idx
on public.audit_logs(entity_type, entity_id, created_at desc);

create or replace view public.child_latest_session_view as
select distinct on (s.child_id)
  s.child_id,
  s.id as session_id,
  s.status,
  s.started_at,
  s.ended_at,
  s.summary_emotion,
  s.summary_distraction,
  s.summary_noise_level,
  s.summary_action,
  s.updated_at
from public.sessions s
order by s.child_id, s.started_at desc nulls last, s.created_at desc;

create or replace view public.child_live_state_view as
select distinct on (e.child_id)
  e.child_id,
  e.session_id,
  e.recorded_at,
  e.emotion,
  e.distraction,
  e.current_difficulty,
  e.gain_capability,
  e.noise_level,
  e.camera_source,
  e.audio_source,
  e.face_detected,
  a.action,
  a.decision_source
from public.session_state_events e
left join lateral (
  select sae.action, sae.decision_source
  from public.session_action_events sae
  where sae.session_id = e.session_id
    and sae.recorded_at <= e.recorded_at
  order by sae.recorded_at desc
  limit 1
) a on true
order by e.child_id, e.recorded_at desc;

create or replace view public.parent_children_overview_view as
select
  c.id as child_id,
  c.parent_account_id,
  c.full_name,
  c.preferred_name,
  c.status,
  cls.session_id as latest_session_id,
  cls.status as latest_session_status,
  cls.started_at as latest_session_started_at,
  cls.summary_emotion,
  cls.summary_distraction,
  cls.summary_noise_level,
  cls.summary_action,
  clv.recorded_at as live_recorded_at,
  clv.emotion as live_emotion,
  clv.distraction as live_distraction,
  clv.noise_level as live_noise_level,
  clv.action as live_action
from public.children c
left join public.child_latest_session_view cls on cls.child_id = c.id
left join public.child_live_state_view clv on clv.child_id = c.id;
