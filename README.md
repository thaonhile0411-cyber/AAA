# Personalized IELTS Learning Platform

Next.js 16 application for IELTS placement, study goals, practice, and progress tracking. The project uses TypeScript and Tailwind CSS. Supabase provides PostgreSQL and authentication; later features will call Gemini from server-side Route Handlers.

## Run locally

1. Install Node.js 24 and run `npm ci`.
2. Copy `.env.example` to `.env.local`. Fill in the project URL and publishable key from the Supabase project Connect dialog. Keep the secret key on the server; only trusted grading/admin code needs it.
3. Run `npm run dev` (or `npm.cmd run dev` in PowerShell if script execution is disabled).
4. Visit `http://localhost:3000` or `http://localhost:3000/dashboard`.

The Supabase browser and server clients are in `src/lib/supabase/`. They require the two `NEXT_PUBLIC_SUPABASE_*` variables when called. `.env.local` is ignored by Git.

### Testing the full placement flow without an AI quota

For local development only, add `AI_EVALUATION_MODE=mock` to `.env.local` and restart the dev server. Listening and Reading continue to use their answer keys; Writing and Speaking still require valid input but return clearly labelled mock results without calling Gemini. This mode is ignored outside `NODE_ENV=development` and must never be used to represent a real assessment.

## Database

The schema source is `supabase/migrations/`. Apply `0001_initial_schema.sql` before `0002_daily_study_time.sql`. The second migration changes study availability to `available_minutes_per_day`. `supabase/seed.sql` contains sample content for development.

See [database setup and RLS guidance](docs/database.md) before linking a hosted Supabase project or applying migrations. The GitHub database check validates the migrations locally; a green check does not apply them to a hosted project.

## Checks

Run `npm run lint`, `npx next typegen`, `npx tsc --noEmit`, and `npm run build` before submitting a pull request. GitHub Actions repeats these checks automatically.
