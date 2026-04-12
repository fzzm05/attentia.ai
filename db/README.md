# Database Setup

This folder contains a Supabase/Postgres-first schema for `attentia.ai`.

The design goals are:

- normalized core entities
- good query performance for dashboards and session history
- compatibility with external identity providers such as Firebase Auth
- room for real-time session updates, parent views, admin analytics, and mobile apps
- a stable Postgres data model behind the web platform

## Files

- `sql/001_schema.sql`
  core schema, enums, tables, indexes, helper functions, and views
- `sql/002_policies.sql`
  optional table security defaults for the current Firebase-backed app flow
- `sql/003_reference_seed.sql`
  reference values and optional bootstrap inserts

## Suggested Order

Run the files in this order inside Supabase SQL Editor:

1. `001_schema.sql`
2. `002_policies.sql`
3. `003_reference_seed.sql`

## Notes

- Application user metadata is stored in `public.profiles`, keyed by the external auth provider UID.
- The current web app uses Firebase Auth for identity and server-side app logic for authorization checks.
- Event tables are indexed for time-series reads and session replay.
- JSONB columns are included where sensor/model payloads are likely to evolve over time.
