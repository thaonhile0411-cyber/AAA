import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { ShadowModel } from "../src/features/shadowing/types.ts";

const origin = process.env.SHADOWING_TEST_ORIGIN ?? "http://localhost:3002";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
const models: ShadowModel[] = JSON.parse(
  readFileSync(
    new URL("../src/features/shadowing/models.generated.json", import.meta.url),
    "utf8",
  ),
);
const landing = await fetch(origin + "/shadowing");
assert.equal(landing.status, 200);
assert.ok((await landing.text()).includes("Shadowing studio"));
for (const model of models) {
  const response = await fetch(`${origin}/shadowing/${model.id}`);
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const label of [
    "Shadowing player",
    "Sentence-by-Sentence",
    "Loop Sentence",
    "Start recording",
    "Tự đánh giá",
    "Nguồn YouTube",
  ])
    assert.ok(html.includes(label), `${model.id}: missing ${label}`);
  const escape = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("'", "&#x27;")
      .replaceAll('"', "&quot;");
  assert.ok(html.includes(escape(model.prompt)));
  assert.ok(!html.includes("instant-shell-url-data"));
  const audio = await fetch(origin + model.audioSrc, {
    headers: { Range: "bytes=0-63" },
  });
  assert.equal(audio.status, 206);
  const data = Buffer.from(await audio.arrayBuffer());
  assert.equal(data.toString("ascii", 0, 4), "RIFF");
  assert.equal(data.readUInt32LE(24), 16000);
  console.log(`PASS ${model.id}: page + range audio`);
}
const session = await fetch(origin + "/api/shadowing/session");
assert.equal(session.status, 200);
assert.match(session.headers.get("cache-control") ?? "", /no-store/);
assert.deepEqual(await session.json(), { userId: null });
console.log(
  "PASS catalog, three practice pages/audio assets and uncached guest session.",
);
