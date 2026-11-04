import { mkdirSync, writeFileSync } from "node:fs";
import { speakingTopics } from "../src/features/speaking/topics.ts";
import { cueCardScript } from "../src/features/speaking/bank.ts";

mkdirSync("public/audio/speaking", { recursive: true });
const recordings = speakingTopics.flatMap((topic) => [
  ...topic.part1.map((q) => ({ id: q.id, text: q.text, audioSrc: q.audioSrc })),
  {
    id: topic.part2.id,
    text: cueCardScript(topic),
    audioSrc: topic.part2.audioSrc,
  },
  ...topic.part3.map((q) => ({ id: q.id, text: q.text, audioSrc: q.audioSrc })),
]);
writeFileSync(
  "public/audio/speaking/manifest.json",
  JSON.stringify(
    {
      language: "en-US",
      kind: "synthetic",
      engine: "Windows System.Speech",
      voice: "Microsoft Zira Desktop",
      recordings,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Prepared ${recordings.length} English question recordings.`);
