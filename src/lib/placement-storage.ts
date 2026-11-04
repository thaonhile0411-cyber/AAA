import type {
  PlacementTestAnswers,
  PlacementTestResult,
  TestSkill,
} from "../types/placement-test.ts";

export const PLACEMENT_ANSWERS_KEY = "aaa:us103:placement:answers:v1";
export const PLACEMENT_SECTION_KEY = "aaa:us103:placement:section:v1";
export const PLACEMENT_COMPLETED_KEY = "aaa:us103:placement:completed:v1";
export const PLACEMENT_RESULT_KEY = "aaa:us103:placement:result:v1";
export const PLACEMENT_TIMER_START_KEY = "aaa:us103:placement:timer_start:v1";
export const PLACEMENT_TIMER_DEADLINE_KEY = "aaa:us103:placement:timer_deadline:v1";
export const PLACEMENT_SUBMITTED_KEY = "aaa:us103:placement:submitted:v1";
export const PLACEMENT_UNLOCKED_KEY = "aaa:us103:placement:unlocked:v1";
export const PLACEMENT_CLOUD_TEST_ID_KEY = "aaa:us103:placement:test_id";

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
    // Preserve audioBase64 when possible for refresh persistence
    const serializableSpeaking: Record<
      string,
      {
        hasRecorded: boolean;
        durationSeconds: number;
        timestamp: string;
        audioBase64?: string;
        mimeType?: string;
        storagePath?: string;
      }
    > = {};

    for (const [key, val] of Object.entries(answers.speakingRecordings)) {
      if (val) {
        serializableSpeaking[key] = {
          hasRecorded: val.hasRecorded,
          durationSeconds: val.durationSeconds,
          timestamp: val.timestamp,
          audioBase64: val.audioBase64,
          mimeType: val.mimeType,
          storagePath: val.storagePath,
        };
      }
    }

    const payload = {
      listening: answers.listening,
      reading: answers.reading,
      writing: answers.writing,
      speakingRecordings: serializableSpeaking,
    };

    try {
      storage.setItem(PLACEMENT_ANSWERS_KEY, JSON.stringify(payload));
    } catch {
      // If quota exceeded due to large base64, save metadata without base64
      const fallbackSpeaking: Record<
        string,
        { hasRecorded: boolean; durationSeconds: number; timestamp: string }
      > = {};
      for (const [key, val] of Object.entries(answers.speakingRecordings)) {
        if (val) {
          fallbackSpeaking[key] = {
            hasRecorded: val.hasRecorded,
            durationSeconds: val.durationSeconds,
            timestamp: val.timestamp,
          };
        }
      }
      storage.setItem(
        PLACEMENT_ANSWERS_KEY,
        JSON.stringify({ ...payload, speakingRecordings: fallbackSpeaking }),
      );
    }
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

export function saveTestTimer(
  startTimeMs: number,
  deadlineMs: number,
  storage: StorageLike = window.localStorage,
): void {
  try {
    storage.setItem(PLACEMENT_TIMER_START_KEY, String(startTimeMs));
    storage.setItem(PLACEMENT_TIMER_DEADLINE_KEY, String(deadlineMs));
  } catch {}
}

export function loadTestTimer(
  storage: StorageLike = window.localStorage,
): { startTimeMs: number | null; deadlineMs: number | null } {
  try {
    const startStr = storage.getItem(PLACEMENT_TIMER_START_KEY);
    const deadlineStr = storage.getItem(PLACEMENT_TIMER_DEADLINE_KEY);
    return {
      startTimeMs: startStr ? Number(startStr) : null,
      deadlineMs: deadlineStr ? Number(deadlineStr) : null,
    };
  } catch {
    return { startTimeMs: null, deadlineMs: null };
  }
}

export function setTestSubmitted(
  isSubmitted: boolean,
  storage: StorageLike = window.localStorage,
): void {
  try {
    if (isSubmitted) {
      storage.setItem(PLACEMENT_SUBMITTED_KEY, "true");
    } else {
      storage.removeItem(PLACEMENT_SUBMITTED_KEY);
    }
  } catch {}
}

export function isTestSubmitted(
  storage: StorageLike = window.localStorage,
): boolean {
  try {
    return storage.getItem(PLACEMENT_SUBMITTED_KEY) === "true";
  } catch {
    return false;
  }
}

export function loadUnlockedSkills(
  storage: StorageLike = window.localStorage,
): TestSkill[] {
  try {
    const raw = storage.getItem(PLACEMENT_UNLOCKED_KEY);
    if (!raw) return ["listening"];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter((s) =>
        ["listening", "reading", "writing", "speaking"].includes(s),
      );
    }
  } catch {}
  return ["listening"];
}

export function saveUnlockedSkills(
  skills: TestSkill[],
  storage: StorageLike = window.localStorage,
): void {
  try {
    storage.setItem(PLACEMENT_UNLOCKED_KEY, JSON.stringify(skills));
  } catch {}
}

export function clearPlacementTestStorage(
  storage: StorageLike = window.localStorage,
): void {
  try {
    storage.removeItem(PLACEMENT_ANSWERS_KEY);
    storage.removeItem(PLACEMENT_SECTION_KEY);
    storage.removeItem(PLACEMENT_COMPLETED_KEY);
    storage.removeItem(PLACEMENT_RESULT_KEY);
    storage.removeItem(PLACEMENT_TIMER_START_KEY);
    storage.removeItem(PLACEMENT_TIMER_DEADLINE_KEY);
    storage.removeItem(PLACEMENT_SUBMITTED_KEY);
    storage.removeItem(PLACEMENT_UNLOCKED_KEY);
    // Only removes the browser pointer to the current attempt. The completed
    // placement_tests row in Supabase remains available for later comparison.
    storage.removeItem(PLACEMENT_CLOUD_TEST_ID_KEY);
  } catch {}
}
