import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clearPlacementTestStorage,
  PLACEMENT_ANSWERS_KEY,
  PLACEMENT_CLOUD_TEST_ID_KEY,
  PLACEMENT_COMPLETED_KEY,
  PLACEMENT_RESULT_KEY,
  PLACEMENT_SECTION_KEY,
  loadSavedAnswers,
  saveAnswersToStorage,
  setPlacementStorageUserId,
} from "../src/lib/placement-storage.ts";

test("starting a new assessment clears the local attempt pointer without touching Supabase data", () => {
  const values = new Map<string, string>([
    [PLACEMENT_ANSWERS_KEY, "{}"],
    [PLACEMENT_SECTION_KEY, "listening"],
    [PLACEMENT_COMPLETED_KEY, "[]"],
    [PLACEMENT_RESULT_KEY, "{}"],
    [PLACEMENT_CLOUD_TEST_ID_KEY, "old-attempt-id"],
  ]);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };

  clearPlacementTestStorage(storage);

  assert.equal(values.size, 0);
});

test("placement browser cache is isolated by authenticated user", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  try {
    setPlacementStorageUserId("learner-a");
    saveAnswersToStorage(
      { listening: { L1: "A" }, reading: {}, writing: { task1: "", task2: "" }, speakingRecordings: {} },
      storage,
    );

    setPlacementStorageUserId("learner-b");
    assert.deepEqual(loadSavedAnswers(storage).listening, {});

    saveAnswersToStorage(
      { listening: { L1: "B" }, reading: {}, writing: { task1: "", task2: "" }, speakingRecordings: {} },
      storage,
    );
    assert.deepEqual(loadSavedAnswers(storage).listening, { L1: "B" });

    setPlacementStorageUserId("learner-a");
    assert.deepEqual(loadSavedAnswers(storage).listening, { L1: "A" });
  } finally {
    setPlacementStorageUserId(null);
  }
});
