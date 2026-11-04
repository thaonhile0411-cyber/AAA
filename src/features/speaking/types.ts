export const speakingParts = ["part-1", "part-2", "part-3"] as const;
export type SpeakingPart = (typeof speakingParts)[number];
export const partInfo: Record<
  SpeakingPart,
  { title: string; name: string; description: string; timing: string }
> = {
  "part-1": {
    title: "Part 1",
    name: "Introduction & interview",
    description:
      "Start with short questions about familiar topics and your everyday life.",
    timing: "4–5 minutes",
  },
  "part-2": {
    title: "Part 2",
    name: "Individual long turn",
    description:
      "Prepare for one minute, then speak for one to two minutes using a cue card.",
    timing: "3–4 minutes",
  },
  "part-3": {
    title: "Part 3",
    name: "Two-way discussion",
    description:
      "Explore broader ideas. Explain your opinions, compare viewpoints and give examples.",
    timing: "4–5 minutes",
  },
};
export type ShortQuestion = { id: string; text: string; audioSrc: string };
export type CueCard = ShortQuestion & {
  cuePoints: [string, string, string] | [string, string, string, string];
};
export type SpeakingVocabulary = {
  term: string;
  ipa: string;
  meaningVi: string;
  example: string;
};
export type GrammarSuggestion = {
  structure: string;
  usageVi: string;
  example: string;
};
export type SpeakingSource = {
  title: string;
  publisher: string;
  url: string;
  accessedAt: string;
  kind: "official-format" | "unofficial-forecast";
};
export type SpeakingEdition = {
  label: string;
  status: "original-practice" | "unverified-prediction";
  updatedAt: string;
  sources: SpeakingSource[];
};
export type SpeakingTopic = {
  id: string;
  title: string;
  descriptionVi: string;
  editions: SpeakingEdition[];
  updatedAt: string;
  suggestedBand: Record<SpeakingPart, "7.0+" | "8.0+">;
  vocabulary: SpeakingVocabulary[];
  grammar: Record<SpeakingPart, GrammarSuggestion[]>;
  part1: ShortQuestion[];
  part2: CueCard;
  part3: ShortQuestion[];
};
