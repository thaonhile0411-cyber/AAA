export type TimedWord = { text: string; start: number; end: number };
export type TimedSentence = {
  id: string;
  text: string;
  start: number;
  end: number;
  words: TimedWord[];
};
export type ShadowModel = {
  id: string;
  title: string;
  part: number;
  topic: string;
  targetBand: string;
  prompt: string;
  cuePoints: string[];
  audioSrc: string;
  audioKind: string;
  voice: string;
  duration: number;
  sentences: TimedSentence[];
};
export type PracticeMode = "continuous" | "sentence" | "loop";
export type Recording = { blob: Blob; duration: number; createdAt: string };
