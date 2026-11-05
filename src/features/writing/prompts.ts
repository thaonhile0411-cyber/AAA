import { originalPracticeTests } from "../../data/original-practice-tests.ts";
import { WRITING_TASKS } from "../../data/placement-test-data.ts";

type WritingTable = {
  caption: string;
  columns: readonly string[];
  rows: readonly (readonly string[])[];
};

export type WritingPrompt = {
  id: string;
  task: 1 | 2 | "practice";
  title: string;
  instructions: string;
  table?: WritingTable;
};

const academicPrompts = WRITING_TASKS.map(({ taskNumber, title, prompt, instructions, chart }) => ({
  id: `ielts-academic-task-${taskNumber}`,
  task: taskNumber,
  title,
  instructions: `${prompt}\n\n${instructions}`,
  table: chart && {
    caption: `${chart.title} · ${chart.unit}`,
    columns: ["Country", ...chart.years],
    rows: chart.series.map(({ country, data }) => [country, ...data.map(String)]),
  },
})) satisfies WritingPrompt[];

export const placementWritingPrompt = academicPrompts.find(({ task }) => task === 2)!;

export const writingPrompts: readonly WritingPrompt[] = [
  ...academicPrompts,
  ...originalPracticeTests.filter((test) => test.skill === "writing").map((test) => ({
    id: test.slug,
    task: "practice" as const,
    title: test.title,
    instructions: test.prompt,
  })),
];
