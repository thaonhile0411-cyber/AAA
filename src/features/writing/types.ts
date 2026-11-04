export const task1Types = [
  "Line graph",
  "Bar chart",
  "Pie chart",
  "Table",
  "Process",
  "Map",
] as const;
export const task2Types = [
  "Opinion",
  "Discussion",
  "Problem-Solution",
  "Advantage-Disadvantage",
] as const;
export type GraphicType = (typeof task1Types)[number];
export type Vocabulary = { term: string; meaning: string; example: string };
export type OutlineSection = { heading: string; suggestion: string };
export type WritingPrompt = {
  id: string;
  title: string;
  task: 1 | 2;
  type: GraphicType | (typeof task2Types)[number];
  topic: string;
  band: "7.0" | "8.0";
  question: string;
  graphic?: { type: GraphicType; description: string };
  outline: OutlineSection[];
  vocabulary: Vocabulary[];
  sample: string[];
  cohesiveDevices: string[];
};
