import { writeFileSync } from "node:fs";
import { speakingTopics } from "../src/features/speaking/topics.ts";
import { responseSentences } from "../src/features/speaking/model-responses.ts";
import { speakingParts } from "../src/features/speaking/types.ts";
import { questionsForPart } from "../src/features/speaking/bank.ts";

const sources = speakingTopics.flatMap((topic) =>
  speakingParts.flatMap((part, partIndex) =>
    questionsForPart(topic, part).map((question, questionIndex) => {
      const sentences = responseSentences[question.id];
      if (!sentences?.length)
        throw new Error(`Missing response: ${question.id}`);
      return {
        id: question.id,
        title: `${topic.title} · Part ${partIndex + 1} · Question ${questionIndex + 1}`,
        part: partIndex + 1,
        topic: topic.title,
        targetBand: part === "part-3" ? "8.0+" : "7.0+",
        prompt: question.text,
        cuePoints: part === "part-2" ? topic.part2.cuePoints : [],
        sentences,
      };
    }),
  ),
);
writeFileSync(
  "src/features/shadowing/models.source.json",
  JSON.stringify(sources, null, 2) + "\n",
);
console.log(`Prepared ${sources.length} answers matched to question IDs.`);
