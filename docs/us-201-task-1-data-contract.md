# US-201 — Task 1: Data Contract

## Purpose

Define the inputs and persisted data required by the Automated Roadmap Generator before changing the database or writing the algorithm.

## Trusted data sources

| Required value | Source | Rule |
| --- | --- | --- |
| `userId` | Supabase authenticated session | The API derives this value from the session. It never accepts a user ID from browser input. |
| `targetBand` | `learning_goals.target_band` | The current saved user goal is the source of truth. |
| `targetExamDate` | `learning_goals.expected_exam_date` | The current saved user goal is the source of truth. |
| `dailyStudyTime` | `learning_goals.available_minutes_per_day` | Stored as minutes per day. |
| `currentBands` | Latest completed `placement_tests` result | Contains Listening, Reading, Writing and Speaking bands. |

The generator may use `learning_goals.self_reported_scores` only when a user has not completed a placement test. If neither source provides four valid skill bands, generation must return a validation error.

## Placement Test gap to close

`placement_tests` already has `assessment_results` and `overall_band` columns. The current US-103 screen calculates its final `PlacementTestResult`, but only saves answers and completion state to Supabase.

Task 2 saves the following values when the completed test is submitted:

```ts
{
  assessment_results: PlacementTestResult,
  overall_band: number | null,
  status: "completed"
}
```

This makes the final four skill scores available to the server instead of leaving them only in the browser.

## Proposed API contract

Endpoint:

```text
POST /api/v1/roadmap/generate
```

The client may request generation with an empty JSON object. The server reads the authenticated user and their saved goal and placement result. This prevents a user from generating or overwriting another user's roadmap.

Successful response shape:

```ts
{
  roadmapId: string;
  mode: "standard" | "intensive";
  warning: string | null;
  bandGap: number;
  totalDays: number;
  totalWeeks: number;
  phases: Array<{
    phaseNumber: 1 | 2 | 3;
    title: "Foundation" | "Skill Building" | "Exam Practice";
    startDate: string;
    endDate: string;
  }>;
}
```

The server returns HTTP 422 when goals or four current skill scores are unavailable or invalid.

## Existing schema and required additions

Existing tables already provide the parent structure:

```text
learning_goals → roadmaps → roadmap_milestones → roadmap_activities
```

US-201 still needs a migration because the existing structure cannot describe a daily plan:

- `roadmaps`: add generation mode, warning, timeframe and score snapshots.
- `roadmap_milestones`: make each record represent one phase and add phase start/end dates.
- `roadmap_activities`: add study date, skill, lesson type and target band for the day.

`tram/us-301-resource-bank` remains the source of real exercises/materials. The generator can be built now; material selection will be connected after US-301 is merged into `main`.

## Algorithm rules agreed for the next tasks

1. `bandGap = targetBand - currentOverallBand`.
2. If the exam is fewer than 14 days away and `bandGap > 2.0`, set mode to `intensive` and return a realistic warning.
3. Divide the available timeframe into 2–3 phases: Foundation, Skill Building and Exam Practice.
4. Allocate more time to a skill with a larger gap from `targetBand`.
5. Produce 1–3 tasks per study day, without exceeding the user's daily study minutes.
