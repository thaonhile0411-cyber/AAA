export type PracticeQuestionResult = {
  questionId: string;
  position: number;
  type: string;
  userAnswer: string;
  correct: boolean;
  unanswered: boolean;
  correctAnswer: string;
  explanation: string;
  evidenceText: string;
  evidenceParagraph: number | null;
  audioStartSeconds: number | null;
  audioEndSeconds: number | null;
};

export type PracticeResult = {
  attemptId: string;
  exerciseId: string;
  skill: "reading" | "listening";
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  totalQuestions: number;
  percentage: number;
  estimatedBand: number | null;
  bandMessage: string;
  transcript: string | null;
  questions: PracticeQuestionResult[];
  completedAt: string;
  processingMs?: number;
};

export type PracticeSubmission = {
  submissionId: string;
  answers: Record<string, string>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validatePracticeSubmission(value: unknown):
  | { ok: true; data: PracticeSubmission }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { ok: false, error: "Dữ liệu nộp bài không hợp lệ." };
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.submissionId !== "string" || !UUID.test(candidate.submissionId))
    return { ok: false, error: "Mã lần nộp không hợp lệ." };
  const answers = candidate.answers;
  if (!answers || typeof answers !== "object" || Array.isArray(answers))
    return { ok: false, error: "Danh sách câu trả lời không hợp lệ." };
  const entries = Object.entries(answers);
  if (entries.length > 100)
    return { ok: false, error: "Bài nộp có quá nhiều câu trả lời." };
  for (const [questionId, answer] of entries) {
    if (!UUID.test(questionId) || typeof answer !== "string" || answer.length > 500)
      return { ok: false, error: "Một câu trả lời không hợp lệ." };
  }
  return {
    ok: true,
    data: { submissionId: candidate.submissionId, answers: answers as Record<string, string> },
  };
}
