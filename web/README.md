# Attentia Web

This is the Next.js web platform for attentia.ai.

It is designed to become the primary management and reporting surface for:

- platform admins
- parents
- child and session history
- live session visibility
- future mobile and realtime integrations

## Current Scope

This scaffold includes:

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- Firebase email/password auth
- role-based admin and parent route groups
- server-side dashboard queries connected to the Supabase schema

## Required Environment Variables

Create the file web/.env.local and fill in:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

The Firebase public values power the browser login flow. The Firebase admin and
Supabase service-role values are required for server-side session validation and
database access.

## Run Locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000

## Routes

- `/` platform landing page
- `/login` Firebase sign-in surface
- `/signup` Firebase bootstrap signup surface
- `/admin` platform admin dashboard
- `/parent` parent dashboard
- `/not-configured` shown when required env vars are missing

## Data Expectations

This app expects the Supabase schema in ../db/sql to already be applied.

It reads from tables and views such as:

- `profiles`
- `parent_accounts`
- `children`
- `sessions`
- `parent_children_overview_view`

## Next Recommended Steps

- add admin create-parent and create-child flows
- add live session stream integration
- add charts and historical reports
- connect to Redis or realtime subscriptions for active sessions
