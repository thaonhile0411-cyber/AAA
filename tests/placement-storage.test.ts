import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clearPlacementTestStorage,
  PLACEMENT_ANSWERS_KEY,
  PLACEMENT_CLOUD_TEST_ID_KEY,
  PLACEMENT_COMPLETED_KEY,
  PLACEMENT_RESULT_KEY,
  PLACEMENT_SECTION_KEY,
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
