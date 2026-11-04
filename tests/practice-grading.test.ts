import test from "node:test";
import assert from "node:assert/strict";
import {
  evidenceParts,
  gradePracticeAnswer,
  normalizePracticeAnswer,
  type GradableQuestion,
} from "../src/lib/practice-grading.ts";
import { originalPracticeTests } from "../src/data/original-practice-tests.ts";

const multipleChoice: GradableQuestion = {
  id: "q1",
  type: "multiple_choice",
  prompt: "What should participants bring?",
  options: ["A notebook", "A passport"],
  acceptedAnswers: ["A notebook"],
  displayAnswer: "A notebook",
  explanation: "The organiser asks participants to bring a notebook.",
  evidence: "bring a notebook",
};

test("US-302 grades multiple choice without case sensitivity", () => {
  assert.equal(gradePracticeAnswer("a NOTEBOOK", multipleChoice).correct, true);
  assert.equal(gradePracticeAnswer("A passport", multipleChoice).correct, false);
});

test("US-302 grades gap fill after trimming and collapsing whitespace", () => {
  const gapFill: GradableQuestion = {
    ...multipleChoice,
    type: "gap_fill",
    acceptedAnswers: ["notebook", "a notebook"],
    displayAnswer: "notebook",
  };
  assert.equal(normalizePracticeAnswer("  NoteBook  "), "notebook");
  assert.equal(gradePracticeAnswer("  A   NOTEBOOK ", gapFill).correct, true);
});

test("US-302 returns the original evidence casing for highlighting", () => {
  assert.deepEqual(
    evidenceParts(
      "Participants should Bring a Notebook before Saturday.",
      "bring a notebook",
    ),
    {
      before: "Participants should ",
      match: "Bring a Notebook",
      after: " before Saturday.",
    },
  );
  assert.equal(evidenceParts("No matching phrase", "answer"), null);
});

test("all US-301 Reading and Listening questions provide valid US-302 evidence", () => {
  const gradable = originalPracticeTests.filter(
    (item) => item.skill === "reading" || item.skill === "listening",
  );
  assert.ok(gradable.some((item) => item.question?.type === "multiple_choice"));
  assert.ok(gradable.some((item) => item.question?.type === "gap_fill"));
  for (const item of gradable) {
    assert.ok(item.question, item.slug);
    assert.ok(evidenceParts(item.prompt, item.question!.evidence), item.slug);
    assert.ok(item.question!.explanation.length >= 20, item.slug);
    assert.ok(item.question!.acceptedAnswers.length > 0, item.slug);
  }
});
