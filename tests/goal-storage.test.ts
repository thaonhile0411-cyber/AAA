import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GOAL_STORAGE_KEY,
  loadBrowserGoals,
  readBrowserProfile,
  saveBrowserGoals,
} from "../src/lib/goal-storage.ts";
import { addDays, todayInVietnam, type GoalInput } from "../src/lib/goals.ts";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
const input: GoalInput = {
  targetBand: 7,
  examDate: addDays(todayInVietnam(), 57),
  dailyStudyMinutes: 60,
  useExistingScores: false,
  scores: null,
};

test("frontend preview saves and reloads goals without an API", () => {
  const storage = memoryStorage();
  assert.equal(readBrowserProfile(storage), null);
  const result = saveBrowserGoals(input, storage);
  assert.equal(result.profile.currentBand, null);
  assert.deepEqual(readBrowserProfile(storage), result.profile);
  const loaded = loadBrowserGoals(storage);
  assert.equal(loaded.demoMode, true);
  assert.equal(loaded.minExamDate, addDays(todayInVietnam(), 7));
});

test("settings update saved goals; existing scores can be cleared", () => {
  const storage = memoryStorage();
  saveBrowserGoals(input, storage);
  const bypass = saveBrowserGoals(
    {
      ...input,
      targetBand: 7.5,
      useExistingScores: true,
      scores: { listening: 7.5, reading: 7, writing: 6.5, speaking: 7 },
    },
    storage,
  );
  assert.equal(bypass.profile.currentBand, 7);
  assert.equal(readBrowserProfile(storage)?.scores?.listening, 7.5);
  const updated = saveBrowserGoals(
    { ...input, dailyStudyMinutes: 120 },
    storage,
  );
  assert.equal(updated.profile.dailyStudyMinutes, 120);
  assert.equal(updated.profile.currentBand, null);
  assert.equal(updated.profile.scores, null);
});

test("invalid submissions do not overwrite saved data", () => {
  const storage = memoryStorage();
  const before = saveBrowserGoals(input, storage).profile;
  assert.throws(() => saveBrowserGoals({ ...input, targetBand: 7.1 }, storage));
  assert.throws(() =>
    saveBrowserGoals({ ...input, examDate: todayInVietnam() }, storage),
  );
  assert.deepEqual(readBrowserProfile(storage), before);
});

test("expired dates remain available for editing and corrupt storage is recoverable", () => {
  const storage = memoryStorage();
  storage.setItem(
    GOAL_STORAGE_KEY,
    JSON.stringify({
      ...input,
      examDate: "2020-01-01",
      currentBand: null,
      scoreSource: null,
      updatedAt: "2020-01-01T00:00:00Z",
    }),
  );
  assert.equal(readBrowserProfile(storage)?.examDate, "2020-01-01");
  for (const raw of ["{", "null", "[]", '{"targetBand":100}']) {
    storage.setItem(GOAL_STORAGE_KEY, raw);
    assert.equal(readBrowserProfile(storage), null);
  }
});

test("browser storage failures are surfaced so form state can remain intact", () => {
  const storage = memoryStorage();
  const blocked = {
    ...storage,
    setItem: () => {
      throw new Error("Quota exceeded");
    },
  };
  assert.throws(() => saveBrowserGoals(input, blocked), /form/);
  const blockedRead = {
    ...storage,
    getItem: () => {
      throw new Error("Storage denied");
    },
  };
  assert.throws(() => loadBrowserGoals(blockedRead), /Storage denied/);
});
