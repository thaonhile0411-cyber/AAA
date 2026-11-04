# US-401.1 — Dashboard & Overview Metrics

Working directory: `AAA-dashboard-us401`. Branch: `feat/us-401-1-dashboard`.

## Branch review before implementation

Fetched **all 11 GitHub branches** on 4 November 2026. The selected baseline is
`origin/tram/us-301-resource-bank`, commit `0a527ebda1bccdf8273bcaf1e0854a2c5f2beb14`.
Git ancestry checks confirm every other remote branch below is already an ancestor
of that baseline. There is no need to merge older branches again.

| Branch | Reviewed integration surface |
| --- | --- |
| `main` | Shared Next.js app and auth foundation |
| `bnxq/us-101-auth` | Session ownership, account flows and RLS |
| `database` | `roadmaps`, milestones, activities and derived progress |
| `feature/supabase-client-foundation` | Server/browser Supabase clients |
| `fix/daily-study-time` | Daily availability field and migration |
| `tram/us-102-target-goal-survey` | Saved targets and self-reported score contract |
| `giangtran/us-103-diagnostic-test` | Persisted assessment results, pending/failed scores |
| `feature/us-302-grading` | Idempotent grader, `practice_completion_events` outbox |
| `feat/us305-us306-speaking` | Existing Speaking/Shadowing practice; local recording completion stays distinct from assessed bands |
| `thuy` | Personalized roadmap, resource slugs, manual completion endpoint, reassessment and adaptive roadmap |
| `tram/us-301-resource-bank` | Integrated Cambridge library, original exercises, grading and all preceding features |

The dashboard reuses `/practice/[slug]` and `/practice/cambridge-10`.
**No separate learning page, exercise catalog, grader or roadmap generator was created.**
The earlier draft changes that saved Placement results were discarded because
that behavior already exists in the integrated branch.

## Data and behavior

- `user_roadmaps` is an RLS-aware view of existing roadmap tables, not a duplicate
  roadmap table. Counts come from `completed_at` on the active roadmap.
- `user_activity_logs` records server-timestamped active time and completion events.
  Time includes activity outside a roadmap; task-linked writes must match the
  authenticated user's active assignment and resource slug.
- The timer counts only visible, focused practice. It stops crediting after 60
  seconds without interaction and excludes suspended timer gaps. Checkpoints are
  sent every 15 active seconds, with a maximum 30 seconds per event.
- Event UUID uniqueness makes transport retries safe. Per-user database locking
  bounds multi-tab time credit so overlapping heartbeats cannot double it.
- Existing roadmap completion emits a completion log once per task. US-302's
  existing outbox updates an assignment in the grading transaction. An overload
  supplies optional assignment context around the original grader; scoring and
  result idempotency remain in the original function.
- Original practice submissions use the existing roadmap completion endpoint.
  Saving a Writing draft alone does not mark it finished; the existing roadmap
  completion control remains available. Cambridge submission and original
  Reading/Listening submission emit the shared completion notification.
- Start Learning carries the resource slug, assignment ID and skill. Cambridge
  assignments open the skill's first Part because existing roadmap records do
  not contain a test/Part identifier. No specific Part is invented in storage.
- `scheduled_date` may be explicitly assigned. Older weekly roadmaps fall back
  to the beginning of their existing scheduled week, relative to roadmap creation,
  in `Asia/Ho_Chi_Minh`. Today's list includes unfinished due/overdue work.
  Future work appears separately as the next step. The dashboard does not replace
  the team's scheduling algorithm.
- Band results come from saved assessments, with dates, placement/reassessment
  labels, and AI/automatic grading sources. Overall is recomputed only when all
  four skill results are available. Failed/pending scores remain unavailable.
  Short US-302 practice percentages never become invented IELTS bands.
- Server rendering uses one aggregate RPC. Realtime, same-browser cross-tab
  notifications, focus/return revalidation and a 15-second fallback update metrics.
  Errors preserve the last successful values with a visible retry message.

## Setup and verification

Use the integrated baseline above, install dependencies, and apply pending
Supabase migrations using the team's normal deployment process. The added
migration is `20261105100000_dashboard_overview.sql`.
No migration has been applied to the shared hosted database by this task.
Historical active time cannot be reconstructed from exercise duration estimates.

```powershell
cd D:\XAMPP\htdocs\BTTH3_PHP\AAA-dashboard-us401
npm.cmd ci
npm.cmd test
npm.cmd run test:dashboard-db
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run dev -- --port 3005
```

Configure the normal gitignored `.env.local` with the team's Supabase URL and
publishable key. Visit `/dashboard` after signing in.

Validation performed:

- 160 repository tests pass, including the 450-minute/15-of-60 scenario, progress
  percentages, unavailable bands, existing resource links, and idle/background time.
- A disposable PGlite PostgreSQL database replays the application migrations and
  seed, then verifies aggregates, unique event retries, task completion retries,
  the existing US-302 outbox and two-user RLS. It does not connect to real learners.
- Type generation/typecheck, ESLint and production build pass.

The inherited repository has two migrations named with version `20261104`; the
AI queue also needs the Placement migration's trigger helper. The disposable
runner orders these by dependency. Follow the team's existing migration history
when deploying; this task does not rename already-shared migrations.

## Performance and remaining acceptance checks

Local database benchmark: Windows, Node 24.15.0, PGlite in memory, 60 roadmap tasks,
900 time events, 30 warm aggregate reads. Observed p95 was approximately **2 ms**.
This excludes HTTP, authentication and browser rendering and **does not prove**
the complete `<600 ms` requirement.

The API exposes `Server-Timing: dashboard`; the client marks
`dashboard-metrics-rendered` after metrics paint. For hosted acceptance, use a
production build and a Supabase instance in the deployment region, document the
browser/device/network/cache conditions, and record navigation-to-metrics-paint
p95 over at least 30 authenticated loads. Measure cold loads separately. The
mark is an instrumentation aid, not a claim of a passed timing target.

CSS includes mobile (375px), tablet (768px) and desktop layouts. Browser visual
QA is still pending: Computer Use stopped because it could not determine the
current Chrome URL reliably enough to enforce its access policy. It did not
complete the visual or end-to-end timing checks. A local component fixture was
prepared under gitignored `.qa/` for review, with no real account data.

Before final acceptance on the shared environment: apply the migration, verify
Start Learning and completion with two real test accounts, check the three
viewport sizes, and record the full `<600 ms` timing under the conditions above.
