import test from "node:test";
import assert from "node:assert/strict";
import {
  practiceResources,
  resourceCollections,
} from "../src/data/practice-resources.ts";

test("US-301 exposes the complete external Reading and Listening catalogue", () => {
  assert.equal(practiceResources.length, 19);
  assert.deepEqual(resourceCollections, [
    "Tất cả",
    "Cambridge IELTS",
    "Actual Test",
    "IELTS Practice Test Plus",
    "IELTS Trainer",
    "Official Guide to IELTS",
  ]);
  for (const resource of practiceResources) {
    assert.match(resource.url, /^https:\/\/tuhoc\.dolenglish\.vn\//);
    assert.match(resource.url, /utm_source=woot6$/);
  }
});
