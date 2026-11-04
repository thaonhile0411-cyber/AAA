import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { speakingTopics } from "../src/features/speaking/topics.ts";
import { speakingParts } from "../src/features/speaking/types.ts";
import { questionsForPart } from "../src/features/speaking/bank.ts";
import { responseSentences } from "../src/features/speaking/model-responses.ts";
import type { ShadowModel } from "../src/features/shadowing/types.ts";

const models: ShadowModel[] = JSON.parse(
  readFileSync(
    new URL("../src/features/shadowing/models.generated.json", import.meta.url),
    "utf8",
  ),
);

test("US-305 + US-306: every question has exactly one matching answer and separate audio", () => {
  const ids: string[] = [];
  for (const topic of speakingTopics)
    for (const [index, part] of speakingParts.entries()) {
      for (const question of questionsForPart(topic, part)) {
        ids.push(question.id);
        const matches = models.filter((model) => model.id === question.id);
        assert.equal(matches.length, 1, question.id);
        const [model] = matches;
        assert.equal(model.part, index + 1);
        assert.equal(model.topic, topic.title);
        assert.equal(model.targetBand, topic.suggestedBand[part]);
        assert.equal(model.prompt, question.text);
        assert.deepEqual(
          model.sentences.map((sentence) => sentence.text),
          responseSentences[question.id],
        );
        assert.deepEqual(
          model.cuePoints,
          part === "part-2" ? topic.part2.cuePoints : [],
        );
        assert.notEqual(model.audioSrc, question.audioSrc);
        assert.ok(model.sentences.length >= 3);
        if (part === "part-2")
          assert.ok(model.duration >= 60 && model.duration <= 120, question.id);
      }
    }
  assert.equal(ids.length, 27);
  assert.deepEqual(new Set(models.map((model) => model.id)), new Set(ids));
  assert.deepEqual(new Set(Object.keys(responseSentences)), new Set(ids));
});
