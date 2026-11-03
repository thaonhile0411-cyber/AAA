# Database and authentication

This is the MVP database design for the Personalized IELTS Learning Platform. It uses Supabase Auth's `auth.users`; the application never stores passwords. The schema intentionally models phases, skill milestones, and activities instead of a daily schedule.

## Text ERD

```text
auth.users
  |-- 1:1 profiles
  |-- 1:1 learning_goals
  |-- 1:N placement_attempts -- 1:N placement_answers -- N:1 placement_questions
  |                                      placement_questions -- 1:1 placement_question_keys
  `-- 1:N roadmaps -- 1:N roadmap_milestones -- 1:N roadmap_activities
             |             (phase + skill)                  |
             |                                              `-- N:0..1 learning_materials
             |-- N:0..1 learning_goals
             `-- N:0..1 placement_attempts
```

`roadmap_progress` is a security-invoker view over roadmaps, milestones, and activities. It does not store a second copy of progress.

## Tables

| Table | Purpose and important constraints |
| --- | --- |
| `profiles` | One-to-one application profile keyed by `auth.users.id`. Created by an auth trigger. No password fields. |
| `learning_goals` | One current goal per user: target half-band, expected exam date, and weekly available minutes. |
| `placement_questions` | Shared active Reading/Listening multiple-choice prompts. Authenticated read-only. |
| `placement_question_keys` | Correct options and explanations, separated so browser clients cannot download them. Trusted secret-key server client only. |
| `placement_attempts` | Private attempt state plus server-computed approximate result. Multiple attempts are allowed. |
| `placement_answers` | One selected option per question in an attempt. Grading writes `is_correct` server-side. |
| `learning_materials` | Shared original lessons/exercises by skill and band range. Published rows are authenticated read-only. |
| `roadmaps` | Personalized roadmap header tied to the same user's optional goal and placement attempt. At most one active roadmap per user. |
| `roadmap_milestones` | Ordered phase/skill milestones. A phase can contain milestones for multiple IELTS skills. |
| `roadmap_activities` | Ordered completable work items, optionally linked to a catalog material. `completed_at` is the completion record. |

UUID primary keys allow safe client/server creation. Foreign keys cascade when private parent data is deleted, while deleting a catalog material only clears an activity's optional material link.

## Progress calculation

Progress is calculated for each roadmap as:

```text
completion percentage = completed activities / total activities * 100
```

An activity is complete when `roadmap_activities.completed_at IS NOT NULL`. The `roadmap_progress` view returns total activities, completed activities, and a percentage rounded to one decimal place. A roadmap with no activities returns `0.0`, avoiding division by zero. Because this value is derived at query time, toggling an activity cannot leave a stale stored percentage.

Example:

```ts
const { data, error } = await supabase
  .from("roadmap_progress")
  .select("total_activities, completed_activities, completion_percentage")
  .eq("roadmap_id", roadmapId)
  .single();
```

## Row Level Security

RLS is enabled on every table in `public`.

- Profiles and goals compare their owner column directly with `auth.uid()`.
- Placement attempts compare `user_id` with `auth.uid()`. Browser inserts/updates must remain ungraded; only trusted server code should fill scores, estimated band, and completion time.
- Placement answers inherit ownership through their attempt. A learner can submit or change an ungraded answer only while the attempt is in progress.
- Roadmaps compare `user_id` with `auth.uid()`. Milestones and activities inherit ownership through their parent roadmap.
- Authenticated users may read active placement questions and published learning materials. No client write policies exist for shared content.
- `placement_question_keys` has RLS enabled and no client policy, making it inaccessible through the publishable key. A trusted secret-key client uses the `service_role` database role and bypasses RLS.
- `roadmap_progress` uses `security_invoker = true`, so the underlying table policies still apply.
- Anonymous users have no policies and therefore cannot read application data.

The Supabase secret key bypasses RLS through the `service_role` database role. It belongs only in trusted server-side Route Handlers and local administration—not React components, client bundles, screenshots, logs, or Git.

## Create a Supabase project and apply the schema

No existing Supabase project is assumed.

1. Create a project at Supabase and save its database password in a password manager.
2. In Authentication settings, enable Email authentication. Decide whether email confirmation should be required for the demo; document the team's choice. Google OAuth is intentionally deferred.
3. Install the Supabase CLI using an officially supported method, then authenticate it.
4. From the repository root, initialize local Supabase configuration if `supabase/config.toml` does not exist:

   ```bash
   supabase init
   ```

   This does not replace the supplied migration or seed file.

5. For local development with Docker running:

   ```bash
   supabase start
   supabase db reset
   ```

   `db reset` recreates the local database, applies `supabase/migrations/0001_initial_schema.sql`, then runs `supabase/seed.sql`.

6. To apply to a newly created hosted project:

   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

7. Run the seed against a development project through the Supabase SQL Editor, or use a reviewed CLI workflow. Do not seed production automatically until the team explicitly decides to do so.
8. Copy `.env.example` to `.env.local` in the Next.js repository and replace placeholders. `.env.local` must remain gitignored.

The migration is the schema source of truth. Prefer a new numbered migration for later changes instead of editing a migration already applied by teammates.

## Connect the existing Next.js application

Install only the official client packages in the teammate's existing project:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Use `@supabase/ssr` for cookie-based App Router authentication. Create separate browser and server utilities in the teammate's chosen integration folder (commonly `src/lib/supabase/client.ts` and `src/lib/supabase/server.ts`). The browser client uses only:

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
```

Server Components and Route Handlers should create a server client with the current Next.js cookie store, following the current Supabase SSR guide. Add middleware/session refresh as recommended by that guide. Do not use the secret key for ordinary signed-in queries; the user's session lets RLS enforce ownership.

If a trusted placement grading Route Handler needs answer keys, create a separate server-only admin client:

```ts
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
```

Before using that client, the Route Handler must authenticate the request and verify that the submitted `attempt_id` belongs to the current user. A secret-key admin client will not protect this automatically. It should compare submitted options with `placement_question_keys`, write `is_correct`, calculate counts and the approximate level using a documented team rule, and mark the attempt complete in one controlled operation. The approximate level must be labeled as non-official in the UI.

Generate TypeScript database types after linking the project:

```bash
supabase gen types typescript --linked > src/types/database.types.ts
```

Coordinate the destination with the teammate before adding that generated file to their application.

## Example application queries

Sign up (the trigger creates `profiles`):

```ts
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: { data: { display_name: displayName } },
});
```

Sign in and sign out:

```ts
const { data, error } = await supabase.auth.signInWithPassword({ email, password });

// Later, from an authenticated client:
const { error: signOutError } = await supabase.auth.signOut();
```

Create or replace the signed-in learner's goal:

```ts
const { data: { user } } = await supabase.auth.getUser();

const { error } = await supabase.from("learning_goals").upsert(
  {
    user_id: user!.id,
    target_band: 7.0,
    expected_exam_date: "2027-03-20",
    available_minutes_per_week: 300,
  },
  { onConflict: "user_id" },
);
```

Read shared placement questions without answer keys:

```ts
const { data, error } = await supabase
  .from("placement_questions")
  .select("id, skill, prompt, options, difficulty, position")
  .order("skill")
  .order("position");
```

Mark an owned roadmap activity complete:

```ts
const { data, error } = await supabase
  .from("roadmap_activities")
  .update({ completed_at: new Date().toISOString() })
  .eq("id", activityId)
  .select()
  .single();
```

RLS makes these filters a convenience, not the security boundary: a user still cannot access another user's row by changing an ID.

## Safe database and RLS testing

Use a local Supabase stack or a dedicated development project—never real student data.

1. Create two disposable Auth users, A and B, with distinct emails.
2. Sign in as A with the publishable key. Create A's goal, attempt, roadmap, milestone, and activity.
3. Sign in as B and try to select, update, and delete A's IDs. Every request should return no rows or an RLS error.
4. As an anonymous client, verify that profiles, goals, questions, materials, and roadmaps return no rows.
5. As either authenticated user, verify published materials and active question prompts are readable.
6. Verify `placement_question_keys` cannot be selected with the publishable key, whether anonymous or authenticated.
7. Verify an authenticated client cannot insert/update/delete `learning_materials` or `placement_questions`.
8. Start an attempt as A. Confirm an answer can be saved with `is_correct = null`, but a client request setting `is_correct` or completing/scoring the attempt is rejected.
9. Using only a server-side secret-key test, grade the attempt. Never print the key. Then verify A can read the result and B cannot.
10. Mark activities complete and confirm `roadmap_progress` changes to the expected percentage; confirm B cannot query A's progress.
11. Run Supabase's database lint/advisor tools and review the Dashboard Security Advisor before deployment.

Test RLS through the API with actual user sessions. Running SQL as the dashboard owner/postgres role bypasses RLS and therefore cannot prove that policies work.

## Implementation checklist

- [ ] Create separate Supabase development and eventual production projects.
- [ ] Enable and configure Email authentication; defer Google OAuth.
- [ ] Apply `0001_initial_schema.sql` and seed only the development environment.
- [ ] Add local secrets to `.env.local`; confirm it is gitignored.
- [ ] Install `@supabase/supabase-js` and `@supabase/ssr` in the existing Next.js app.
- [ ] Add browser/server clients and App Router session refresh using the current Supabase SSR guide.
- [ ] Implement sign-up, sign-in, sign-out, and protected-page behavior.
- [ ] Implement trusted server-side placement grading without exposing answer keys.
- [ ] Document the team's approximate placement-band conversion rule.
- [ ] Generate TypeScript database types after the first hosted migration.
- [ ] Run the two-user RLS test matrix and save results for the Scrum review.
- [ ] Review Security Advisor findings before the Vercel deployment.

## Official references

- [Supabase Next.js SSR client setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs)
- [Supabase API key types and safe usage](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [PostgreSQL foreign-key constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
