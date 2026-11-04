import type { SpeakingPart, SpeakingTopic } from "./types";

export function isSpeakingPart(value: string): value is SpeakingPart {
  return value === "part-1" || value === "part-2" || value === "part-3";
}
export function questionsForPart(topic: SpeakingTopic, part: SpeakingPart) {
  return part === "part-1"
    ? topic.part1
    : part === "part-2"
      ? [topic.part2]
      : topic.part3;
}
export function filterTopics(
  topics: SpeakingTopic[],
  filters: {
    part: SpeakingPart;
    search: string;
    topic: string;
    year: string;
    quarter: string;
  },
) {
  const query = filters.search.trim().toLocaleLowerCase();
  return topics.filter(
    (topic) =>
      (!filters.topic || topic.id === filters.topic) &&
      topic.editions.some((edition) => {
        const [year, quarter] = edition.split("-");
        return (
          (!filters.year || filters.year === year) &&
          (!filters.quarter || filters.quarter === quarter)
        );
      }) &&
      (!query ||
        `${topic.title} ${topic.descriptionVi} ${questionsForPart(
          topic,
          filters.part,
        )
          .map((q) => q.text)
          .join(
            " ",
          )} ${filters.part === "part-2" ? topic.part2.cuePoints.join(" ") : ""}`
          .toLocaleLowerCase()
          .includes(query)),
  );
}
export function cueCardScript(topic: SpeakingTopic) {
  return `${topic.part2.text} You should say: ${topic.part2.cuePoints.join(". ")}. You have one minute to prepare. You should speak for one to two minutes.`;
}
