# AAA — US-102 Target Goal Survey

AAA is a Next.js application for the Personalized IELTS Learning Platform. This
branch implements US-102: the learner's IELTS target survey, with Supabase
storage and per-user Row Level Security.

## Routes

| Route | Purpose |
| --- | --- |
| `/onboarding/goals` | New learner target survey |
| `/settings/goals` | Read and update the saved target |
| `/api/goals` | Authenticated `GET` and `PUT` API for US-102 |

The API requires a Supabase Auth session. A request without a signed-in user
returns `401`; it never writes a goal under another user's account.

## Data model

`public.learning_goals` stores one goal for each `auth.users` account:

- `target_band`: 3.0–9.0 in 0.5 increments.
- `expected_exam_date`: validated by the API as at least seven Vietnamese
  calendar days in the future.
- `available_minutes_per_day`: the selected daily study availability.
- `self_reported_scores`: optional JSON with Listening, Reading, Writing and
  Speaking bands when the learner bypasses the placement test.

The browser computes the overall band from those four scores, and warns when
the target is lower than or equal to that score. `0004` adds PostgreSQL
constraints for the target range and score object; the existing RLS policies
allow users to read and update only their own row.

## Supabase migrations

Migration source lives in `supabase/migrations/`:

1. `0001_initial_schema.sql` — profiles, learning goals, RLS and platform schema.
2. `0002_daily_study_time.sql` — moves availability to daily minutes.
3. `0003_us102_goal_survey_scores.sql` — records the existing JSONB score field.
4. `0004_us102_goal_survey_validation.sql` — US-102 database constraints.

This branch is linked to project `hbykdmctfljfrfwrrbaw`. To view the saved
rows in Supabase, open **Table Editor → `learning_goals`**. To check migration
state from the repository:

```powershell
npx.cmd supabase migration list --remote
```

## Local setup

```powershell
npm.cmd install
npm.cmd run dev
```

`.env.local` holds the public Supabase URL and publishable key. It is ignored
by Git. Never commit or expose a Supabase secret/service-role key.

## Verification

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```
