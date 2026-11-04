import assert from "node:assert/strict";
import test from "node:test";
import {
  answerGroupsFor,
  answerKeyFor,
  cambridgeIelts10Tests,
} from "../src/data/cambridge-ielts-10.ts";

test("Cambridge IELTS 10 has a complete 40-question key for every supplied Reading/Listening test", () => {
  for (const testId of [
    "academic-test-1",
    "academic-test-2",
    "academic-test-3",
    "academic-test-4",
  ]) {
    for (const skill of ["listening", "reading"] as const) {
      assert.equal(Object.keys(answerKeyFor(testId, skill) ?? {}).length, 40, `${testId} ${skill}`);
    }
  }

  for (const testId of ["general-test-a", "general-test-b"]) {
    assert.equal(Object.keys(answerKeyFor(testId, "reading") ?? {}).length, 40, `${testId} reading`);
    assert.equal(answerKeyFor(testId, "listening"), undefined);
  }
});

test("Cambridge answer groups preserve book-marked either-order answers", () => {
  assert.deepEqual(answerGroupsFor("academic-test-3", "listening"), [
    { numbers: [11, 12], accepted: ["C", "E"] },
  ]);
  assert.deepEqual(answerGroupsFor("academic-test-4", "listening"), [
    { numbers: [21, 22], accepted: ["A", "E"] },
    { numbers: [23, 24], accepted: ["B", "C"] },
  ]);
});

test("Academic listening transcripts remain separately sourced until submission", () => {
  const academicTests = cambridgeIelts10Tests.filter((item) => item.edition === "academic");
  assert.equal(academicTests.length, 4);
  assert.deepEqual(academicTests.map((item) => item.transcriptPages), [
    [131, 132, 133, 134, 135],
    [136, 137, 138, 139, 140],
    [141, 142, 143, 144, 145, 146],
    [146, 147, 148, 149, 150, 151],
  ]);
});
