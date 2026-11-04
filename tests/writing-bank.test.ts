import assert from "node:assert/strict";
import { test } from "node:test";
import { writingPrompts } from "../src/features/writing/prompts.ts";
import {
  countWords,
  filterPrompts,
  highlightSegments,
} from "../src/features/writing/bank.ts";
import { task1Types, task2Types } from "../src/features/writing/types.ts";

const emptyFilters = { search: "", task: "", topic: "", band: "", type: "" };

test("US-303: catalog covers every requested task and question type", () => {
  assert.equal(
    new Set(writingPrompts.map((p) => p.id)).size,
    writingPrompts.length,
  );
  assert.deepEqual(
    new Set(writingPrompts.filter((p) => p.task === 1).map((p) => p.type)),
    new Set(task1Types),
  );
  assert.deepEqual(
    new Set(writingPrompts.filter((p) => p.task === 2).map((p) => p.type)),
    new Set(task2Types),
  );
  assert.deepEqual(
    new Set(writingPrompts.map((p) => p.band)),
    new Set(["7.0", "8.0"]),
  );
});

test("AC-303.1: prompts have instructions, topics, and Task 1 graphic descriptions", () => {
  for (const prompt of writingPrompts) {
    assert.ok(prompt.question.length > 100, prompt.id);
    assert.ok(prompt.topic);
    if (prompt.task === 1) {
      assert.equal(prompt.graphic?.type, prompt.type);
      assert.ok(prompt.graphic.description.length > 100);
      assert.match(prompt.question, /Summarise the information/);
    }
    assert.equal(prompt.outline.length, 4, prompt.id);
    assert.equal(prompt.vocabulary.length, 5, prompt.id);
    assert.equal(prompt.sample.length, 4, prompt.id);
    assert.ok(
      countWords(prompt.sample.join(" ")) >= (prompt.task === 1 ? 150 : 250),
      `Sample too short: ${prompt.id}`,
    );
  }
});

test("Technology scenario provides five vocabulary entries and a four-paragraph outline", () => {
  const [prompt] = filterPrompts(writingPrompts, {
    ...emptyFilters,
    task: "2",
    topic: "Technology",
  });
  assert.equal(prompt.id, "technology-in-education");
  assert.deepEqual(
    prompt.outline.map((s) => s.heading),
    ["Introduction", "Body 1", "Body 2", "Conclusion"],
  );
  assert.equal(prompt.vocabulary.length, 5);
  for (const item of prompt.vocabulary) {
    assert.ok(item.meaning);
    assert.ok(item.example);
  }
});

test("filters combine task, topic, band, type and case-insensitive trimmed search", () => {
  assert.deepEqual(
    filterPrompts(writingPrompts, {
      search: "  PAPER  ",
      task: "1",
      topic: "Environment",
      band: "8.0",
      type: "Process",
    }).map((p) => p.id),
    ["paper-recycling"],
  );
  assert.equal(
    filterPrompts(writingPrompts, { ...emptyFilters, search: "no-such-prompt" })
      .length,
    0,
  );
  assert.equal(
    filterPrompts(writingPrompts, {
      ...emptyFilters,
      task: "2",
      type: "Process",
    }).length,
    0,
  );
  assert.equal(
    filterPrompts(writingPrompts, emptyFilters).length,
    writingPrompts.length,
  );
});

test("AC-303.3: every sample highlights vocabulary and cohesive devices without altering its text", () => {
  for (const prompt of writingPrompts) {
    const text = prompt.sample.join("\n\n");
    const segments = highlightSegments(
      text,
      prompt.vocabulary.map((v) => v.term),
      prompt.cohesiveDevices,
    );
    assert.equal(segments.map((s) => s.text).join(""), text);
    assert.ok(
      segments.some((s) => s.kind === "vocabulary"),
      prompt.id,
    );
    assert.ok(
      segments.some((s) => s.kind === "cohesion"),
      prompt.id,
    );
    for (const item of prompt.vocabulary)
      assert.ok(
        segments.some(
          (s) =>
            s.kind === "vocabulary" &&
            s.text.toLowerCase() === item.term.toLowerCase(),
        ),
        `${prompt.id}: unused vocab ${item.term}`,
      );
  }
});

test("highlights handle word boundaries, punctuation, overlap, repeated terms and HTML as text", () => {
  const text =
    "However, pulp contains pulpwood. PULP! <script>example</script>";
  const segments = highlightSegments(
    text,
    ["pulp", "", "<script>"],
    ["However", "example"],
  );
  assert.equal(
    segments.filter((s) => s.text.toLowerCase() === "pulp").length,
    2,
  );
  assert.equal(segments.map((s) => s.text).join(""), text);
  assert.equal(
    highlightSegments(
      "digital literacy",
      ["digital", "digital literacy"],
      [],
    )[0].text,
    "digital literacy",
  );
  assert.deepEqual(highlightSegments("plain", [], []), [{ text: "plain" }]);
});

test("word count handles empty input, multiple spaces and paragraph breaks", () => {
  assert.equal(countWords(" \n\t "), 0);
  assert.equal(countWords("A clear\n\nargument\twith  examples."), 5);
});
