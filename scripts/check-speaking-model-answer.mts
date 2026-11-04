import assert from "node:assert/strict";
import { speakingTopics } from "../src/features/speaking/topics.ts";
import { speakingParts } from "../src/features/speaking/types.ts";
import { questionsForPart } from "../src/features/speaking/bank.ts";

const origin = process.env.SPEAKING_TEST_ORIGIN ?? "http://localhost:3003";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
const landing = await fetch(origin + "/speaking", { redirect: "manual" });
assert.equal(landing.status, 307);
assert.equal(landing.headers.get("location"), "/speaking/part-1");
const escape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("'", "&#x27;")
    .replaceAll('"', "&quot;");

for (const part of speakingParts) {
  const bank = await fetch(`${origin}/speaking/${part}`);
  assert.equal(bank.status, 200);
  const bankHtml = await bank.text();
  assert.ok(bankHtml.includes("Speaking Question &amp; Model Answer"));
  assert.ok(!bankHtml.includes('href="/shadowing"'));
  for (const topic of speakingTopics) {
    const topicResponse = await fetch(`${origin}/speaking/${part}/${topic.id}`);
    assert.equal(topicResponse.status, 200);
    const topicHtml = await topicResponse.text();
    assert.ok(topicHtml.includes("Nguồn &amp; trạng thái"));
    assert.ok(topicHtml.includes("Mục tiêu luyện"));
    assert.ok(topicHtml.includes(topic.suggestedBand[part]));
    assert.ok(topicHtml.includes("không phải đề thi chính thức"));
    for (const question of questionsForPart(topic, part)) {
      const path = `/speaking/${part}/${topic.id}/${question.id}`;
      assert.ok(topicHtml.includes(`href="${path}"`));
      const response = await fetch(origin + path);
      assert.equal(response.status, 200);
      const html = await response.text();
      for (const label of [
        escape(question.text),
        "Model Answer",
        "Shadowing player",
        "Start recording",
        "Key Vocabulary",
        "Grammar suggestions",
        "Pronunciation",
      ])
        assert.ok(html.includes(label), `${question.id}: ${label}`);
      assert.ok(!html.includes('href="/shadowing"'));
      assert.ok(!html.includes("instant-shell-url-data"));
      for (const asset of [
        question.audioSrc,
        `/audio/shadowing/${question.id}.wav`,
      ]) {
        const audio = await fetch(origin + asset, {
          headers: { Range: "bytes=0-63" },
        });
        assert.equal(audio.status, 206);
        assert.equal(
          Buffer.from(await audio.arrayBuffer()).toString("ascii", 0, 4),
          "RIFF",
        );
      }
      console.log(`PASS ${path}`);
    }
  }
}
for (const path of ["/shadowing", "/shadowing/hometown-quiet-place"]) {
  const response = await fetch(origin + path, { redirect: "manual" });
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "/speaking");
}
const session = await fetch(origin + "/api/shadowing/session");
assert.equal(session.status, 200);
assert.match(session.headers.get("cache-control") ?? "", /no-store/);
assert.deepEqual(await session.json(), { userId: null });
console.log(
  "PASS 3 part banks, 9 topic pages, 27 answer pages, 54 audio streams and legacy redirects.",
);
