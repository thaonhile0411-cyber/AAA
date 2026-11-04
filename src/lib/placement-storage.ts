import type {
  PlacementTestAnswers,
  PlacementTestResult,
  TestSkill,
} from "../types/placement-test.ts";

export const PLACEMENT_ANSWERS_KEY = "aaa:us103:placement:answers:v1";
export const PLACEMENT_SECTION_KEY = "aaa:us103:placement:section:v1";
export const PLACEMENT_COMPLETED_KEY = "aaa:us103:placement:completed:v1";
export const PLACEMENT_RESULT_KEY = "aaa:us103:placement:result:v1";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function loadSavedAnswers(
  storage: StorageLike = window.localStorage,
): PlacementTestAnswers {
  const defaultAnswers: PlacementTestAnswers = {
    listening: {},
    reading: {},
    writing: { task1: "", task2: "" },
    speakingRecordings: {},
  };

  try {
    const raw = storage.getItem(PLACEMENT_ANSWERS_KEY);
    if (!raw) return defaultAnswers;
    const parsed = JSON.parse(raw);
    return {
      listening: parsed.listening || {},
      reading: parsed.reading || {},
      writing: {
        task1: parsed.writing?.task1 || "",
        task2: parsed.writing?.task2 || "",
      },
      speakingRecordings: parsed.speakingRecordings || {},
    };
  } catch {
    return defaultAnswers;
  }
}

export function saveAnswersToStorage(
  answers: PlacementTestAnswers,
  storage: StorageLike = window.localStorage,
): void {
  try {
    // Strip non-serializable blobUrls before saving to localStorage
    const serializableSpeaking: Record<
      string,
      { hasRecorded: boolean; durationSeconds: number; timestamp: string }
    > = {};

    for (const [key, val] of Object.entries(answers.speakingRecordings)) {
      serializableSpeaking[key] = {
        hasRecorded: val.hasRecorded,
        durationSeconds: val.durationSeconds,
        timestamp: val.timestamp,
      };
    }

    const payload = {
      listening: answers.listening,
      reading: answers.reading,
      writing: answers.writing,
      speakingRecordings: serializableSpeaking,
    };

    storage.setItem(PLACEMENT_ANSWERS_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("Could not save answers to localStorage", err);
  }
}

export function loadSavedSection(
  storage: StorageLike = window.localStorage,
): TestSkill {
  try {
    const val = storage.getItem(PLACEMENT_SECTION_KEY) as TestSkill | null;
    if (val && ["listening", "reading", "writing", "speaking"].includes(val)) {
      return val;
    }
  } catch {}
  return "listening";
}

export function saveActiveSection(
  skill: TestSkill,
  storage: StorageLike = window.localStorage,
): void {
  try {
    storage.setItem(PLACEMENT_SECTION_KEY, skill);
  } catch {}
}

export function loadCompletedSkills(
  storage: StorageLike = window.localStorage,
): TestSkill[] {
  try {
    const raw = storage.getItem(PLACEMENT_COMPLETED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((s) =>
        ["listening", "reading", "writing", "speaking"].includes(s),
      );
    }
  } catch {}
  return [];
}

export function saveCompletedSkills(
  skills: TestSkill[],
  storage: StorageLike = window.localStorage,
): void {
  try {
    storage.setItem(PLACEMENT_COMPLETED_KEY, JSON.stringify(skills));
  } catch {}
}

export function loadSavedResult(
  storage: StorageLike = window.localStorage,
): PlacementTestResult | null {
  try {
    const raw = storage.getItem(PLACEMENT_RESULT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlacementTestResult;
  } catch {
    return null;
  }
}

export function saveResultToStorage(
  result: PlacementTestResult,
  storage: StorageLike = window.localStorage,
): void {
  try {
    storage.setItem(PLACEMENT_RESULT_KEY, JSON.stringify(result));
  } catch (err) {
    console.warn("Could not save placement test result", err);
  }
}

export function clearPlacementTestStorage(
  storage: StorageLike = window.localStorage,
): void {
  try {
    storage.removeItem(PLACEMENT_ANSWERS_KEY);
    storage.removeItem(PLACEMENT_SECTION_KEY);
    storage.removeItem(PLACEMENT_COMPLETED_KEY);
    storage.removeItem(PLACEMENT_RESULT_KEY);
  } catch {}
}
