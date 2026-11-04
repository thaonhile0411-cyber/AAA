import type { TimedSentence, PracticeMode } from "./types";

export function sentenceAt(sentences: TimedSentence[], time: number) {
  const index = sentences.findIndex(
    (sentence) => time >= sentence.start && time < sentence.end,
  );
  return index < 0
    ? time >= (sentences.at(-1)?.end ?? Infinity)
      ? sentences.length - 1
      : 0
    : index;
}
export function wordAt(sentence: TimedSentence, time: number) {
  return sentence.words.findIndex(
    (word) => time >= word.start && time < word.end,
  );
}
export function playbackSegment(
  sentences: TimedSentence[],
  position: number,
  mode: PracticeMode,
  selected: number,
) {
  const total = sentences.at(-1)?.end ?? 0;
  const offset = position >= total - 0.01 ? 0 : Math.max(0, position);
  const index =
    mode === "loop"
      ? Math.max(0, Math.min(selected, sentences.length - 1))
      : sentenceAt(sentences, offset);
  const start = mode === "loop" ? sentences[index].start : offset;
  const end = mode === "continuous" ? total : sentences[index].end;
  return { index, start, end, duration: end - start };
}
export function formatTime(seconds: number) {
  const value = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}
