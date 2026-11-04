import test from "node:test";
import assert from "node:assert/strict";
import {
  practiceResources,
  resourceCollections,
} from "../src/data/practice-resources.ts";

test("US-301 exposes the complete external four-skill catalogue", () => {
  assert.equal(practiceResources.length, 21);
  assert.deepEqual(resourceCollections, [
    "Tất cả",
    "Cambridge IELTS",
    "Actual Test",
    "IELTS Practice Test Plus",
    "IELTS Trainer",
    "Official Guide to IELTS",
    "DOL English Samples",
  ]);
  for (const resource of practiceResources) {
    assert.match(resource.url, /^https:\/\/tuhoc\.dolenglish\.vn\//);
  }
  assert.deepEqual(
    practiceResources.flatMap((resource) => resource.skills).sort(),
    [...Array(19).fill(["listening", "reading"]), ["speaking"], ["writing"]]
      .flat()
      .sort(),
  );
});
