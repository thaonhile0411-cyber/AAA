export const BAND_GROUPS = [
  { value: "below_5", label: "Dưới 5.0", description: "Xây nền tảng" },
  { value: "5_6", label: "5.0–6.5", description: "Củng cố kỹ năng" },
  { value: "6_7", label: "6.5–7.5", description: "Tăng độ chính xác" },
  { value: "8_plus", label: "8.0+", description: "Chinh phục nâng cao" },
] as const;
export type BandGroup = (typeof BAND_GROUPS)[number]["value"];
export type PracticeSkill = "reading" | "listening";
export const QUESTION_TYPES = {
  multiple_choice: "Multiple Choice",
  true_false_not_given: "True / False / Not Given",
  gap_fill: "Gap-fill",
  matching_headings: "Matching Headings",
} as const;
export type QuestionType = keyof typeof QUESTION_TYPES;
export type PracticeQuestion = {
  id: string;
  position: number;
  type: QuestionType;
  prompt: string;
  options: string[];
  instruction: string;
};
export type ExerciseSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  skill: PracticeSkill;
  band_group: BandGroup;
  question_types: QuestionType[];
  duration_minutes: number;
  question_count: number;
};
export type Exercise = ExerciseSummary & {
  passage: string[] | null;
  audio_path: string | null;
  audio_bytes: number | null;
  audio_mime: string | null;
  content_version: number;
  questions: PracticeQuestion[];
};
export type PracticeContext = {
  userId: string | null;
  currentBand: number | null;
  bandSource: "self_reported" | "placement" | null;
};
export type Highlight = {
  id: string;
  paragraph: number;
  start: number;
  end: number;
  color: "yellow" | "green";
  note: string;
};
export type Draft = {
  version: 1;
  contentVersion: number;
  answers: Record<string, string>;
  highlights: Highlight[];
  notes: string;
  audioTime: number;
  speed: number;
  updatedAt: string;
};
export const PLAYBACK_SPEEDS = [0.8, 1, 1.25, 1.5] as const;
export const AUTO_SAVE_MS = 15000;

/** Half-band levels make the gap between 7.5 and 8.0 unambiguous. 6.5 belongs to the higher group. */
export function bandGroupFor(band: number | null): BandGroup | null {
  if (band === null || !Number.isFinite(band) || band < 0 || band > 9)
    return null;
  if (band < 5) return "below_5";
  if (band < 6.5) return "5_6";
  if (band < 8) return "6_7";
  return "8_plus";
}

export function isBandGroup(value: string): value is BandGroup {
  return BAND_GROUPS.some((group) => group.value === value);
}
export function isQuestionType(value: string): value is QuestionType {
  return Object.hasOwn(QUESTION_TYPES, value);
}
export function draftKey(userId: string | null, exerciseId: string) {
  return `aaa:practice:v1:${userId ?? "guest"}:${exerciseId}`;
}
export function newDraft(contentVersion: number): Draft {
  return {
    version: 1,
    contentVersion,
    answers: {},
    highlights: [],
    notes: "",
    audioTime: 0,
    speed: 1,
    updatedAt: new Date().toISOString(),
  };
}
export function restoreDraft(
  raw: string | null,
  exercise: Exercise,
): Draft | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Draft;
    if (
      value.version !== 1 ||
      value.contentVersion !== exercise.content_version ||
      !value.answers ||
      typeof value.answers !== "object" ||
      Array.isArray(value.answers)
    )
      return null;
    const answers: Record<string, string> = {};
    for (const question of exercise.questions) {
      const answer = value.answers[question.id];
      if (
        typeof answer === "string" &&
        answer.length <= 500 &&
        (question.type === "gap_fill" || question.options.includes(answer))
      )
        answers[question.id] = answer;
    }
    const highlights = (Array.isArray(value.highlights) ? value.highlights : [])
      .filter((item) => {
        if (!item || typeof item !== "object") return false;
        const text = exercise.passage?.[item.paragraph];
        return (
          typeof text === "string" &&
          typeof item.id === "string" &&
          Number.isInteger(item.start) &&
          Number.isInteger(item.end) &&
          item.start >= 0 &&
          item.start < item.end &&
          item.end <= text.length &&
          ["yellow", "green"].includes(item.color) &&
          typeof item.note === "string" &&
          item.note.length <= 2000
        );
      })
      .slice(0, 300);
    return {
      ...newDraft(exercise.content_version),
      answers,
      highlights,
      notes: typeof value.notes === "string" ? value.notes.slice(0, 10000) : "",
      audioTime:
        typeof value.audioTime === "number" && Number.isFinite(value.audioTime)
          ? Math.max(0, value.audioTime)
          : 0,
      speed: PLAYBACK_SPEEDS.includes(
        value.speed as (typeof PLAYBACK_SPEEDS)[number],
      )
        ? value.speed
        : 1,
      updatedAt:
        typeof value.updatedAt === "string"
          ? value.updatedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** New annotations replace just the intersecting range, preserving both outside fragments. */
export function applyHighlight(
  items: Highlight[],
  selection: Omit<Highlight, "color" | "note">,
  color: Highlight["color"] | null,
): Highlight[] {
  const result: Highlight[] = [];
  for (const item of items) {
    if (
      item.paragraph !== selection.paragraph ||
      item.end <= selection.start ||
      item.start >= selection.end
    ) {
      result.push(item);
      continue;
    }
    if (item.start < selection.start)
      result.push({ ...item, end: selection.start });
    if (item.end > selection.end)
      result.push({ ...item, id: `${item.id}-r`, start: selection.end });
  }
  if (color) result.push({ ...selection, color, note: "" });
  return result.sort((a, b) => a.paragraph - b.paragraph || a.start - b.start);
}

export function passageSegments(
  text: string,
  paragraph: number,
  highlights: Highlight[],
) {
  const ranges = highlights
    .filter((item) => item.paragraph === paragraph)
    .sort((a, b) => a.start - b.start);
  const result: { text: string; highlight: Highlight | null }[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start < cursor) continue;
    if (range.start > cursor)
      result.push({ text: text.slice(cursor, range.start), highlight: null });
    result.push({ text: text.slice(range.start, range.end), highlight: range });
    cursor = range.end;
  }
  if (cursor < text.length)
    result.push({ text: text.slice(cursor), highlight: null });
  return result;
}
