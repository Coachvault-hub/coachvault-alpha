# CoachVault Engine 3.8.0 — Accounts, Organizations & Native Forms

## New product architecture

CoachVault now has the first working version of:

Login -> Organization -> Role -> Season Roadmap -> Native Forms -> Responses

### Routes
- `/` Public homepage
- `/login` Coach / director sign in
- `/workspace` CoachVault coaching workspace
- `/roadmap` Authenticated season roadmap

## Authentication

The code is Supabase-ready.

Required Vercel environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Until those are configured, `/login` runs in Demo Mode with:
- Director Demo
- Coach Demo

This allows the full UX to be tested before connecting production authentication.

## Roles

Director / Admin:
- Build forms
- Add roadmap items
- Assign native forms to roadmap items
- See submission counts
- View responses

Coach:
- See season roadmap
- Complete native CoachVault forms
- Mark tasks complete
- Track required-item progress

## Native CoachVault Form Builder

Supported fields:
- Short answer
- Long answer
- Number
- Date
- Dropdown
- Multiple choice
- Checkboxes
- Acknowledgement

Built-in starter templates:
- Coach Profile & Bio
- Helmet Ordering
- Tournament Selection
- Practice Availability

## Database

`supabase/coachvault-schema.sql` contains the initial production schema and RLS policies for:
- organizations
- profiles
- teams
- forms
- roadmap_items
- form_submissions
- roadmap_completions

## Important

The UI currently persists roadmap/forms/responses in localStorage while in Demo Mode.
Once Supabase environment variables and schema are configured, the next step is replacing
those local adapters with Supabase reads/writes.

## PDF ingestion

All Engine 3.7.0 large-PDF diagnostic/background-analysis work remains included.
