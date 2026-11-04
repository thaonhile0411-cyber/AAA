import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { createPracticeStore } from "../src/features/shadowing/local-store.ts";
import {
  formatTime,
  playbackSegment,
  sentenceAt,
  wordAt,
} from "../src/features/shadowing/timeline.ts";
import {
  microphoneMessage,
  recordingMime,
} from "../src/components/audio/recorder-support.ts";
import type { ShadowModel } from "../src/features/shadowing/types.ts";

const models: ShadowModel[] = JSON.parse(
  readFileSync(
    new URL("../src/features/shadowing/models.generated.json", import.meta.url),
    "utf8",
  ),
);
const original = JSON.parse(
  readFileSync(
    new URL("../src/features/shadowing/models.source.json", import.meta.url),
    "utf8",
  ),
);
const recording = () => ({
  blob: new Blob(["test audio bytes"], { type: "audio/webm" }),
  duration: 4,
  createdAt: new Date().toISOString(),
});

test("model audio, original transcript and sentence/word timestamps match", () => {
  assert.deepEqual(
    [...new Set(models.map((model) => model.part))].sort(),
    [1, 2, 3],
  );
  for (const model of models) {
    const source = original.find(
      (item: { id: string }) => item.id === model.id,
    );
    assert.deepEqual(
      model.sentences.map((sentence) => sentence.text),
      source.sentences,
    );
    const wav = readFileSync(
      new URL(`../public${model.audioSrc}`, import.meta.url),
    );
    assert.equal(wav.toString("ascii", 0, 4), "RIFF");
    assert.equal(wav.toString("ascii", 8, 12), "WAVE");
    assert.equal(wav.readUInt32LE(24), 16000);
    assert.equal(wav.readUInt16LE(34), 16);
    assert.ok(Math.abs((wav.length - 44) / 32000 - model.duration) < 0.001);
    let previous = 0;
    for (const sentence of model.sentences) {
      assert.ok(Math.abs(sentence.start - previous) < 0.001);
      assert.ok(sentence.end > sentence.start);
      assert.ok(sentence.words.length > 3);
      assert.equal(
        sentence.words.map((word) => word.text).join(""),
        sentence.text,
      );
      for (const word of sentence.words) {
        assert.ok(
          word.start >= sentence.start && word.end <= sentence.end + 0.001,
        );
        assert.ok(word.end >= word.start);
        assert.equal(wordAt(sentence, (word.start + word.end) / 2) >= 0, true);
      }
      previous = sentence.end;
    }
    assert.equal(model.audioKind, "synthetic-demo");
    assert.equal(model.sentences.at(-1)?.end, model.duration);
    let peak = 0;
    for (let i = 44; i + 1 < wav.length; i += 2)
      peak = Math.max(peak, Math.abs(wav.readInt16LE(i)));
    assert.ok(peak > 100);
  }
});

test("AC-306.2: sentence practice schedules only sentence 1; next range requires explicit next position", () => {
  const sentences = models[0].sentences;
  const first = playbackSegment(sentences, 0, "sentence", 0);
  assert.equal(first.start, sentences[0].start);
  assert.equal(first.end, sentences[0].end);
  assert.ok(first.end < sentences[1].end);
  const next = playbackSegment(sentences, sentences[1].start, "sentence", 1);
  assert.equal(next.index, 1);
  assert.equal(next.start, first.end);
  for (const rate of [0.75, 1, 1.25]) assert.ok(first.duration / rate > 0);
});

test("loop uses selected sentence boundaries and continuous mode ends at full duration", () => {
  const model = models.find((item) => item.part === 2)!;
  const segment = playbackSegment(
    model.sentences,
    model.sentences[3].start + 0.4,
    "loop",
    3,
  );
  assert.equal(segment.start, model.sentences[3].start);
  assert.equal(segment.end, model.sentences[3].end);
  assert.deepEqual(
    playbackSegment(model.sentences, segment.end, "loop", 3),
    segment,
  );
  assert.equal(
    playbackSegment(model.sentences, 0, "continuous", 0).end,
    model.duration,
  );
  assert.equal(sentenceAt(model.sentences, model.sentences[1].start), 1);
  assert.equal(
    sentenceAt(model.sentences, model.duration),
    model.sentences.length - 1,
  );
  assert.equal(
    playbackSegment(model.sentences, model.duration, "continuous", 0).start,
    0,
  );
});

test("saved audio survives a new store instance and remains scoped by user and question", async () => {
  const factory = new IDBFactory();
  const store = createPracticeStore(factory);
  const value = recording();
  await store.save("user-a", "question-1", value);
  const reloaded = createPracticeStore(factory);
  const saved = await reloaded.load("user-a", "question-1");
  assert.ok(saved);
  assert.equal(await saved.blob.text(), await value.blob.text());
  assert.equal(saved.duration, value.duration);
  assert.equal(await reloaded.load("user-b", "question-1"), undefined);
  assert.equal(await reloaded.load("user-a", "question-2"), undefined);
});

test("delete and re-record replace only the specified user's question", async () => {
  const store = createPracticeStore(new IDBFactory());
  await store.save("a", "q", recording());
  await store.save("b", "q", recording());
  await store.remove("a", "q");
  assert.equal(await store.load("a", "q"), undefined);
  assert.ok(await store.load("b", "q"));
  const replacement = { ...recording(), duration: 12 };
  await store.save("a", "q", replacement);
  assert.equal((await store.load("a", "q"))?.duration, 12);
});

test("failed transaction is rejected and never replaces an existing saved recording", async () => {
  const factory = new IDBFactory();
  const store = createPracticeStore(factory);
  await store.save("a", "q", recording());
  const put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (value, key) {
    const request = put.call(this, value, key);
    queueMicrotask(() => this.transaction.abort());
    return request;
  };
  try {
    await assert.rejects(
      store.save("a", "q", { ...recording(), duration: 15 }),
      /Không lưu được/,
    );
  } finally {
    IDBObjectStore.prototype.put = put;
  }
  assert.equal((await store.load("a", "q"))?.duration, 4);
});

test("completion is counted once even with concurrent confirmation and after reload", async () => {
  const factory = new IDBFactory();
  const first = createPracticeStore(factory);
  const second = createPracticeStore(factory);
  assert.equal(await first.completed("a", "q"), false);
  const results = await Promise.all([
    first.complete("a", "q"),
    second.complete("a", "q"),
  ]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(await second.completed("a", "q"), true);
  assert.equal(await second.complete("a", "q"), false);
  assert.equal(await second.completed("b", "q"), false);
});

test("invalid or empty recordings are not saved and no guest scope is accepted", async () => {
  const store = createPracticeStore(new IDBFactory());
  await assert.rejects(
    store.save("a", "q", { ...recording(), blob: new Blob([]) }),
  );
  await assert.rejects(store.save("a", "q", { ...recording(), duration: NaN }));
  await assert.rejects(store.save("a", "q", { ...recording(), duration: 200 }));
  await assert.rejects(store.save("", "q", recording()));
  assert.equal(await store.load("a", "q"), undefined);
});

test("permission, missing device and busy microphone errors provide actionable guidance", () => {
  assert.match(
    microphoneMessage({ name: "NotAllowedError" }),
    /Microphone.*Cho phép/,
  );
  assert.match(microphoneMessage({ name: "NotFoundError" }), /Kết nối/);
  assert.match(
    microphoneMessage({ name: "NotReadableError" }),
    /Đóng ứng dụng/,
  );
  assert.ok(microphoneMessage(null));
  assert.equal(
    recordingMime((type) => type === "audio/mp4"),
    "audio/mp4",
  );
  assert.equal(
    recordingMime(() => false),
    "",
  );
  assert.equal(formatTime(65.8), "1:05");
  assert.equal(formatTime(NaN), "0:00");
});
