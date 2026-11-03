# AAA — US-102 & US-301

AAA is a Next.js application for the Personalized IELTS Learning Platform. This
branch implements the US-102 goal survey and US-301 Reading/Listening exercise
bank, with Supabase storage and per-user Row Level Security.

## Routes

| Route                  | Purpose                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| `/onboarding/goals`    | New learner target survey                                        |
| `/settings/goals`      | Read and update the saved target                                 |
| `/api/goals`           | Authenticated `GET` and `PUT` API for US-102                     |
| `/practice`            | Exercise bank with skill, current-band and question-type filters |
| `/practice/[slug]`     | Reading or Listening practice workspace                          |
| `/api/practice`        | Published exercise catalog and current-band recommendation       |
| `/api/practice/[slug]` | Published passage/audio and question prompts                     |

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

The API recomputes overall from those four scores and also reads the latest
completed placement result when no self-reported scores exist. Both the UI and
API return a warning when target <= current band. `0004` and `0005` enforce the
survey rules in PostgreSQL; existing RLS allows access only to the owner's goal.

US-101 authentication is supplied by the team. US-102 requires a Supabase cookie
session from that flow. On onboarding save, `nextStep` is `placement` or
`roadmap`. Set `AAA_PLACEMENT_PATH`/`AAA_ROADMAP_PATH` once those team routes
exist to automatically navigate there; until then the survey shows its handoff
status instead of navigating to a missing page. Account settings save in place.
The end-to-end redirect acceptance criterion awaits those team screens.

## Supabase migrations

Migration source lives in `supabase/migrations/`:

1. `0001_initial_schema.sql` — profiles, learning goals, RLS and platform schema.
2. `0002_daily_study_time.sql` — moves availability to daily minutes.
3. `0003_profile_avatar.sql` — exact recovery of hosted migration 0003, including the JSONB score field and profile avatar trigger.
4. `0004_us102_goal_survey_validation.sql` — US-102 database constraints.
5. `0005_us102_goal_submission_guards.sql` — strict JSON score validation, seven-day exam rule and allowed study choices.
6. `0006_us301_exercise_bank.sql` — exercise bank, questions and RLS.
7. `0007_us301_original_exercises.sql` — initial US-301 sample data.
8. `0008_us301_voa_public_domain_content.sql` — eight source-attributed VOA Learning English exercises and 40 AAA-authored questions.

This branch is linked to project `hbykdmctfljfrfwrrbaw`. To view the saved
rows in Supabase, open **Table Editor → `learning_goals`**. To check migration
state from the repository:

```powershell
npx.cmd supabase migration list --remote
```

## Local setup

Use Node.js 24.15+ (the DOM test environment requires this version).

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
npm.cmd run test:integration
```

The integration runner requires a running local Supabase stack; it never uses
the hosted database for test users. `python scripts/test-migrations.py` replays
the migration chain in a temporary local PostgreSQL database without resetting
the developer's Supabase database.

See [US-301 implementation and verification](docs/us301.md) for practice UI,
audio, offline drafts, content management and remaining manual browser checks.
