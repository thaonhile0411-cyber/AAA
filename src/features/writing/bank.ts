import type { WritingPrompt } from "./types";

export type BankFilters = {
  search: string;
  task: string;
  topic: string;
  band: string;
  type: string;
};
export function filterPrompts(prompts: WritingPrompt[], filters: BankFilters) {
  const query = filters.search.trim().toLocaleLowerCase();
  return prompts.filter(
    (p) =>
      (!filters.task || String(p.task) === filters.task) &&
      (!filters.topic || p.topic === filters.topic) &&
      (!filters.band || p.band === filters.band) &&
      (!filters.type || p.type === filters.type) &&
      (!query ||
        `${p.title} ${p.question} ${p.topic} ${p.type}`
          .toLocaleLowerCase()
          .includes(query)),
  );
}
export function countWords(text: string) {
  return text.trim().match(/\S+/gu)?.length ?? 0;
}

// Split into plain text segments; never interpret sample content as HTML.
export function highlightSegments(
  text: string,
  vocabulary: string[],
  devices: string[],
) {
  const terms = [
    ...vocabulary.map((term) => ({ term, kind: "vocabulary" as const })),
    ...devices.map((term) => ({ term, kind: "cohesion" as const })),
  ]
    .filter(({ term }) => term.length > 0)
    .sort((a, b) => b.term.length - a.term.length);
  const segments: { text: string; kind?: "vocabulary" | "cohesion" }[] = [];
  let plain = "";
  for (let i = 0; i < text.length;) {
    const match = terms.find(
      ({ term }) =>
        text.slice(i, i + term.length).toLowerCase() === term.toLowerCase() &&
        (i === 0 || !/[\p{L}\p{N}_]/u.test(text[i - 1])) &&
        (i + term.length === text.length ||
          !/[\p{L}\p{N}_]/u.test(text[i + term.length])),
    );
    if (match) {
      if (plain) segments.push({ text: plain });
      plain = "";
      segments.push({
        text: text.slice(i, i + match.term.length),
        kind: match.kind,
      });
      i += match.term.length;
    } else {
      plain += text[i];
      i++;
    }
  }
  if (plain) segments.push({ text: plain });
  return segments;
}
