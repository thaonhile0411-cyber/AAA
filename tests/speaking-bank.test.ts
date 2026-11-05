import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { speakingTopics } from "../src/features/speaking/topics.ts";
import {
  cueCardScript,
  filterTopics,
  isSpeakingPart,
  questionsForPart,
} from "../src/features/speaking/bank.ts";
import { speakingParts } from "../src/features/speaking/types.ts";

const filters = {
  part: "part-1" as const,
  search: "",
  topic: "",
  year: "2026",
  quarter: "Q4",
};
const allQuestions = speakingTopics.flatMap((topic) => [
  ...topic.part1,
  topic.part2,
  ...topic.part3,
]);

test("US-305: all three parts have separate, non-overlapping question IDs", () => {
  assert.equal(allQuestions.length, 27);
  assert.equal(
    new Set(allQuestions.map((q) => q.id)).size,
    allQuestions.length,
  );
  for (const part of speakingParts) {
    assert.ok(isSpeakingPart(part));
    for (const topic of speakingTopics) {
      const questions = questionsForPart(topic, part);
      assert.equal(questions.length, part === "part-2" ? 1 : 4);
      assert.ok(
        questions.every((q) => q.id.includes(part.replace("part-", "p"))),
      );
    }
  }
  assert.equal(isSpeakingPart("part-4"), false);
  assert.equal(isSpeakingPart("Part 1"), false);
});

test("Hometown scenario: exactly four Part 1 questions, each with a local audio file", () => {
  const [topic] = filterTopics(speakingTopics, {
    ...filters,
    topic: "hometown",
  });
  assert.equal(topic.title, "Hometown");
  assert.equal(topic.part1.length, 4);
  for (const question of topic.part1) {
    assert.ok(question.text.endsWith("?"));
    assert.match(question.audioSrc, /^\/audio\/speaking\/[a-z0-9-]+\.wav$/);
  }
  assert.equal(topic.vocabulary.length, 5);
});

test("AC-305.1: each Part 2 cue card has a main prompt and three or four unique bullet points", () => {
  for (const topic of speakingTopics) {
    assert.match(topic.part2.text, /^Describe /);
    assert.ok(
      topic.part2.cuePoints.length >= 3 && topic.part2.cuePoints.length <= 4,
    );
    assert.equal(
      new Set(topic.part2.cuePoints).size,
      topic.part2.cuePoints.length,
    );
    const script = cueCardScript(topic);
    assert.ok(script.startsWith(topic.part2.text));
    for (const point of topic.part2.cuePoints)
      assert.ok(script.includes(point));
    assert.match(script, /one minute to prepare/);
    assert.match(script, /one to two minutes/);
  }
});

test("AC-305.3: all topics have IPA, Vietnamese meanings and examples, plus grammar for each part", () => {
  for (const topic of speakingTopics) {
    assert.equal(topic.vocabulary.length, 5);
    for (const item of topic.vocabulary) {
      assert.ok(item.term);
      assert.match(item.ipa, /^\/.+\/$/u);
      assert.ok(item.meaningVi.length > 8);
      assert.ok(item.example.length > 25);
    }
    for (const part of speakingParts) {
      assert.ok(topic.grammar[part].length >= 2);
      for (const item of topic.grammar[part]) {
        assert.ok(item.structure);
        assert.ok(item.usageVi);
        assert.ok(item.example);
      }
    }
  }
});

test("forecast labels require sources, dates and explicit non-official wording", () => {
  for (const topic of speakingTopics) {
    assert.match(topic.updatedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.deepEqual(topic.suggestedBand, {
      "part-1": "7.0+",
      "part-2": "7.0+",
      "part-3": "8.0+",
    });
    for (const edition of topic.editions) {
      assert.match(edition.label, /^\d{4}-Q[1-4]$/);
      assert.match(edition.updatedAt, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(edition.sources.length > 0, edition.label);
      for (const source of edition.sources) {
        assert.match(source.url, /^https:\/\//);
        assert.ok(source.title && source.publisher);
        assert.match(source.accessedAt, /^\d{4}-\d{2}-\d{2}$/);
      }
      if (edition.status === "unverified-prediction")
        assert.ok(
          edition.sources.some(
            (source) => source.kind === "unofficial-forecast",
          ),
          `${topic.id}:${edition.label}`,
        );
    }
  }
});

test("quarter and year must match the same edition, with topic and search combined", () => {
  assert.equal(filterTopics(speakingTopics, filters).length, 3);
  assert.deepEqual(
    filterTopics(speakingTopics, { ...filters, quarter: "Q3" }).map(
      (t) => t.id,
    ),
    ["hometown", "work-and-study"],
  );
  assert.deepEqual(
    filterTopics(speakingTopics, { ...filters, year: "2025" }).map((t) => t.id),
    ["hometown"],
  );
  assert.equal(
    filterTopics(speakingTopics, { ...filters, year: "2025", quarter: "Q3" })
      .length,
    0,
  );
  assert.equal(
    filterTopics(speakingTopics, { ...filters, quarter: "Q1" }).length,
    0,
  );
  assert.deepEqual(
    filterTopics(speakingTopics, { ...filters, search: "  HOMETOWN  " }).map(
      (t) => t.id,
    ),
    ["hometown"],
  );
  assert.equal(
    filterTopics(speakingTopics, {
      ...filters,
      topic: "technology",
      search: "hometown",
    }).length,
    0,
  );
  assert.equal(
    filterTopics(speakingTopics, {
      ...filters,
      search: "no matching questions",
    }).length,
    0,
  );
  assert.equal(
    filterTopics(speakingTopics, { ...filters, year: "", quarter: "" }).length,
    3,
  );
});

test("search only matches questions within the selected part", () => {
  assert.equal(
    filterTopics(speakingTopics, {
      ...filters,
      search: "protect old buildings",
    }).length,
    0,
  );
  assert.deepEqual(
    filterTopics(speakingTopics, {
      ...filters,
      part: "part-3",
      search: "protect old buildings",
    }).map((t) => t.id),
    ["hometown"],
  );
  assert.deepEqual(
    filterTopics(speakingTopics, {
      ...filters,
      part: "part-2",
      search: "who you learned it from",
    }).map((t) => t.id),
    ["work-and-study"],
  );
});

test("AC-305.2: audio manifest matches every question and the entire cue-card script", () => {
  const manifest = JSON.parse(
    readFileSync(
      new URL("../public/audio/speaking/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(manifest.kind, "synthetic");
  assert.equal(manifest.language, "en-US");
  assert.equal(manifest.recordings.length, allQuestions.length);
  assert.equal(
    new Set(manifest.recordings.map((r: { id: string }) => r.id)).size,
    allQuestions.length,
  );
  for (const question of allQuestions) {
    const recording = manifest.recordings.find(
      (r: { id: string }) => r.id === question.id,
    );
    assert.equal(recording.audioSrc, question.audioSrc);
    const topic = speakingTopics.find((t) => t.part2.id === question.id);
    assert.equal(recording.text, topic ? cueCardScript(topic) : question.text);
  }
});

test("all 27 audio assets contain non-silent, correctly formatted PCM audio", () => {
  const directory = new URL("../public/audio/speaking/", import.meta.url);
  assert.equal(
    readdirSync(directory).filter((file) => file.endsWith(".wav")).length,
    27,
  );
  for (const question of allQuestions) {
    const audio = readFileSync(
      new URL(
        question.audioSrc.slice(1),
        new URL("../public/", import.meta.url),
      ),
    );
    assert.equal(audio.toString("ascii", 0, 4), "RIFF", question.id);
    assert.equal(audio.toString("ascii", 8, 12), "WAVE", question.id);
    let format: Buffer | undefined;
    let samples: Buffer | undefined;
    for (let offset = 12; offset + 8 <= audio.length;) {
      const id = audio.toString("ascii", offset, offset + 4);
      const length = audio.readUInt32LE(offset + 4);
      assert.ok(offset + 8 + length <= audio.length, question.id);
      if (id === "fmt ")
        format = audio.subarray(offset + 8, offset + 8 + length);
      if (id === "data")
        samples = audio.subarray(offset + 8, offset + 8 + length);
      offset += 8 + length + (length % 2);
    }
    assert.ok(format && samples, question.id);
    assert.equal(format.readUInt16LE(0), 1); // PCM
    assert.equal(format.readUInt16LE(2), 1); // mono
    assert.equal(format.readUInt32LE(4), 22050);
    assert.equal(format.readUInt16LE(14), 16);
    const seconds = samples.length / 44100;
    assert.ok(seconds > 1 && seconds < 90, `${question.id}: ${seconds}s`);
    let peak = 0;
    for (let i = 0; i + 1 < samples.length; i += 2)
      peak = Math.max(peak, Math.abs(samples.readInt16LE(i)));
    assert.ok(peak > 100, `${question.id}: silent recording`);
  }
});
