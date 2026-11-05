export type GradableQuestion = {
  id: string;
  type: "multiple_choice" | "gap_fill";
  prompt: string;
  options?: readonly string[];
  acceptedAnswers: readonly string[];
  displayAnswer: string;
  explanation: string;
  evidence: string;
};

export type GradeResult = {
  correct: boolean;
  correctAnswer: string;
  explanation: string;
};

export type EvidenceParts = {
  before: string;
  match: string;
  after: string;
};

/** Keep grading deterministic while accepting case and harmless whitespace differences. */
export function normalizePracticeAnswer(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

export function gradePracticeAnswer(
  answer: string,
  question: GradableQuestion,
): GradeResult {
  const normalized = normalizePracticeAnswer(answer);
  return {
    correct: question.acceptedAnswers.some(
      (candidate) => normalizePracticeAnswer(candidate) === normalized,
    ),
    correctAnswer: question.displayAnswer,
    explanation: question.explanation,
  };
}

/** Split the source without changing its original casing for accessible highlighting. */
export function evidenceParts(
  source: string,
  evidence: string,
): EvidenceParts | null {
  const start = source.toLocaleLowerCase("en").indexOf(evidence.toLocaleLowerCase("en"));
  if (start < 0) return null;
  const end = start + evidence.length;
  return {
    before: source.slice(0, start),
    match: source.slice(start, end),
    after: source.slice(end),
  };
}
