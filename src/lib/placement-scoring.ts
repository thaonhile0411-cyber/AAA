import {
  LISTENING_PARTS,
  READING_PARTS,
  SPEAKING_CONTENT,
} from "../data/placement-test-data.ts";
import type {
  PlacementTestAnswers,
  PlacementTestResult,
  SkillScoreResult,
  TestSkill,
} from "../types/placement-test.ts";

/** Normalizes a text answer by trimming whitespace and punctuation */
export function normalizeAnswer(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
    .replace(/\s+/g, " ");
}

/** Check if user's text answer matches the expected answer(s) */
export function isAnswerCorrect(
  userAnswer: string | undefined,
  correctAnswer: string | string[],
): boolean {
  if (!userAnswer || !userAnswer.trim()) return false;
  const normalizedUser = normalizeAnswer(userAnswer);

  if (Array.isArray(correctAnswer)) {
    return correctAnswer.some((ans) => normalizeAnswer(ans) === normalizedUser);
  }
  return normalizeAnswer(correctAnswer) === normalizedUser;
}

/** Official IELTS overall band rounding: mean rounded to nearest half-band (e.g. .25 -> .5, .75 -> next whole) */
export function roundToIeltsBand(rawScore: number): number {
  return Math.round(rawScore * 2) / 2;
}

/** Count words in text */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/** Band conversion for 10-question demo listening */
export function getListeningBand(correctCount: number): number {
  if (correctCount >= 10) return 8.5;
  if (correctCount === 9) return 8.0;
  if (correctCount === 8) return 7.0;
  if (correctCount === 7) return 6.5;
  if (correctCount === 6) return 6.0;
  if (correctCount === 5) return 5.5;
  if (correctCount === 4) return 5.0;
  if (correctCount === 3) return 4.5;
  if (correctCount === 2) return 4.0;
  if (correctCount === 1) return 3.5;
  return 3.0;
}

/** Band conversion for 12-question demo reading */
export function getReadingBand(correctCount: number): number {
  if (correctCount >= 12) return 8.5;
  if (correctCount === 11) return 8.0;
  if (correctCount === 10) return 7.5;
  if (correctCount === 9) return 7.0;
  if (correctCount === 8) return 6.5;
  if (correctCount === 7) return 6.0;
  if (correctCount === 6) return 5.5;
  if (correctCount === 5) return 5.0;
  if (correctCount === 4) return 4.5;
  if (correctCount === 3) return 4.0;
  if (correctCount >= 1) return 3.5;
  return 3.0;
}

/** Calculate Listening Score */
export function scoreListening(
  answers: Record<string, string>,
): SkillScoreResult {
  const allQuestions = LISTENING_PARTS.flatMap((p) => p.questions);
  let correct = 0;

  for (const q of allQuestions) {
    if (isAnswerCorrect(answers[q.id], q.correctAnswer)) {
      correct++;
    }
  }

  const total = allQuestions.length;
  const percentage = Math.round((correct / total) * 100);
  const band = getListeningBand(correct);

  return {
    skill: "listening",
    band,
    rawScore: correct,
    totalQuestions: total,
    percentage,
    details: {
      "Số câu đúng": `${correct} / ${total}`,
      "Tỷ lệ chính xác": `${percentage}%`,
      "Part 1 (Hội thoại hàng ngày)": `${
        allQuestions
          .filter((q) => q.part === 1)
          .filter((q) => isAnswerCorrect(answers[q.id], q.correctAnswer)).length
      }/3 câu`,
      "Part 2 (Tình huống xã hội)": `${
        allQuestions
          .filter((q) => q.part === 2)
          .filter((q) => isAnswerCorrect(answers[q.id], q.correctAnswer)).length
      }/2 câu`,
      "Part 3 (Thảo luận học thuật)": `${
        allQuestions
          .filter((q) => q.part === 3)
          .filter((q) => isAnswerCorrect(answers[q.id], q.correctAnswer)).length
      }/3 câu`,
      "Part 4 (Bài giảng học thuật)": `${
        allQuestions
          .filter((q) => q.part === 4)
          .filter((q) => isAnswerCorrect(answers[q.id], q.correctAnswer)).length
      }/2 câu`,
    },
    feedback:
      correct >= 8
        ? "Khả năng nghe hiểu rất tốt, nắm bắt thông tin chi tiết và từ vựng học thuật chuẩn xác."
        : correct >= 5
          ? "Nắm được ý chính và hội thoại cơ bản; cần củng cố kỹ năng nghe ghi chú và hội thoại chuyên sâu."
          : "Cần cải thiện phản xạ nhận diện âm thanh và từ vựng trọng tâm trong các bài nói tiếng Anh.",
  };
}

/** Calculate Reading Score */
export function scoreReading(answers: Record<string, string>): SkillScoreResult {
  const allQuestions = READING_PARTS.flatMap((p) => p.questions);
  let correct = 0;

  for (const q of allQuestions) {
    if (isAnswerCorrect(answers[q.id], q.correctAnswer)) {
      correct++;
    }
  }

  const total = allQuestions.length;
  const percentage = Math.round((correct / total) * 100);
  const band = getReadingBand(correct);

  return {
    skill: "reading",
    band,
    rawScore: correct,
    totalQuestions: total,
    percentage,
    details: {
      "Số câu đúng": `${correct} / ${total}`,
      "Tỷ lệ chính xác": `${percentage}%`,
      "Part 1 (Đọc hiểu cơ bản)": `${
        allQuestions
          .filter((q) => q.part === 1)
          .filter((q) => isAnswerCorrect(answers[q.id], q.correctAnswer)).length
      }/4 câu`,
      "Part 2 (Matching Headings)": `${
        allQuestions
          .filter((q) => q.part === 2)
          .filter((q) => isAnswerCorrect(answers[q.id], q.correctAnswer)).length
      }/4 câu`,
      "Part 3 (Đọc hiểu học thuật)": `${
        allQuestions
          .filter((q) => q.part === 3)
          .filter((q) => isAnswerCorrect(answers[q.id], q.correctAnswer)).length
      }/4 câu`,
    },
    feedback:
      correct >= 10
        ? "Khả năng đọc hiểu xuất sắc, định vị thông tin nhanh và phân biệt True/False/Not Given chính xác."
        : correct >= 6
          ? "Đọc hiểu cơ bản ổn định; cần rèn luyện thêm chiến thuật nối tiêu đề (Matching Headings) và suy luận logic."
          : "Cần tích lũy thêm từ vựng học thuật và rèn luyện kỹ năng Skimming & Scanning văn bản dài.",
  };
}

/** Calculate Writing Demo Estimated Score */
export function scoreWriting(writingAnswers: {
  task1?: string;
  task2: string;
}): SkillScoreResult {
  const t1Words = countWords(writingAnswers.task1 || "");
  const t2Words = countWords(writingAnswers.task2 || "");

  const hasTask1 = t1Words > 0;
  const isSingleTask = !hasTask1;

  // Evaluation criteria based on length, paragraph breaks, and vocabulary
  let avgRatio: number;
  let wordCount: number;

  if (isSingleTask) {
    wordCount = t2Words;
    avgRatio = Math.min(1.2, t2Words / 250);
  } else {
    wordCount = t1Words + t2Words;
    const t1Ratio = Math.min(1.2, t1Words / 150);
    const t2Ratio = Math.min(1.2, t2Words / 250);
    avgRatio = t1Ratio * 0.4 + t2Ratio * 0.6;
  }

  // Criteria simulation
  let taskAchievement = 4.0;
  if (avgRatio >= 1.0) taskAchievement = 6.5;
  else if (avgRatio >= 0.8) taskAchievement = 6.0;
  else if (avgRatio >= 0.5) taskAchievement = 5.0;
  else if (avgRatio >= 0.2) taskAchievement = 4.5;

  const hasParagraphsT2 = (writingAnswers.task2 || "").includes("\n");
  const hasParagraphs = isSingleTask
    ? hasParagraphsT2
    : (writingAnswers.task1 || "").includes("\n") && hasParagraphsT2;

  let coherence = 4.5;
  if (hasParagraphs && avgRatio >= 0.8) coherence = 6.5;
  else if (hasParagraphs) coherence = 5.5;

  let lexical = 4.5;
  if (wordCount >= (isSingleTask ? 250 : 350)) lexical = 6.5;
  else if (wordCount >= (isSingleTask ? 150 : 200)) lexical = 5.5;
  else if (wordCount >= 50) lexical = 5.0;

  let grammar = 4.5;
  if (wordCount >= (isSingleTask ? 250 : 350)) grammar = 6.0;
  else if (wordCount >= (isSingleTask ? 150 : 150)) grammar = 5.5;
  else if (wordCount >= 50) grammar = 5.0;

  // If user wrote virtually nothing
  if (wordCount === 0) {
    taskAchievement = 3.0;
    coherence = 3.0;
    lexical = 3.0;
    grammar = 3.0;
  }

  const band = roundToIeltsBand(
    (taskAchievement + coherence + lexical + grammar) / 4,
  );

  return {
    skill: "writing",
    band,
    details: isSingleTask
      ? {
          "Task 2 (Bài luận Essay)": `${t2Words} / 250 từ yêu cầu`,
          "Tổng số từ đã viết": `${t2Words} từ`,
        }
      : {
          "Task 1 (Mô tả biểu đồ)": `${t1Words} / 150 từ yêu cầu`,
          "Task 2 (Bài luận Essay)": `${t2Words} / 250 từ yêu cầu`,
          "Tổng số từ đã viết": `${t1Words + t2Words} từ`,
        },
    criteria: [
      {
        name: "Task Achievement / Task Response",
        score: taskAchievement,
        description:
          (isSingleTask ? t2Words >= 250 : t1Words >= 150 && t2Words >= 250)
            ? "Đạt và vượt độ dài yêu cầu tối thiểu."
            : "Chưa đạt đủ số lượng từ tối thiểu cho bài thi.",
      },
      {
        name: "Coherence & Cohesion",
        score: coherence,
        description: hasParagraphs
          ? "Có cấu trúc đoạn văn rõ ràng và phân chia ý hợp lý."
          : "Cần cải thiện cấu trúc bố cục đoạn và từ nối liên kết câu.",
      },
      {
        name: "Lexical Resource",
        score: lexical,
        description: "Ước lượng độ phong phú của vốn từ vựng được sử dụng.",
      },
      {
        name: "Grammatical Range & Accuracy",
        score: grammar,
        description: "Ước lượng cấu trúc ngữ pháp và độ hoàn thiện câu viết.",
      },
    ],
    feedback:
      "Demo Estimated Score: Điểm ước lượng dựa trên số lượng từ và cấu trúc văn bản.",
  };
}

/** Calculate Speaking Demo Estimated Score */
export function scoreSpeaking(
  recordings: Record<
    string,
    { hasRecorded: boolean; durationSeconds: number; timestamp: string }
  >,
): SkillScoreResult {
  const part1Count = SPEAKING_CONTENT.part1.questions.length; // 3
  const part2Count = 1; // 1
  const part3Count = SPEAKING_CONTENT.part3.questions.length; // 2
  const totalQuestions = part1Count + part2Count + part3Count; // 6

  let recordedCount = 0;
  let totalDuration = 0;

  for (const key of Object.keys(recordings)) {
    if (recordings[key]?.hasRecorded) {
      recordedCount++;
      totalDuration += recordings[key].durationSeconds || 0;
    }
  }

  const completionRatio = totalQuestions > 0 ? recordedCount / totalQuestions : 0;

  let fluency = 4.0;
  if (completionRatio >= 0.8 && totalDuration >= 90) fluency = 6.5;
  else if (completionRatio >= 0.6) fluency = 6.0;
  else if (completionRatio >= 0.3) fluency = 5.0;
  else if (completionRatio > 0) fluency = 4.5;
  else fluency = 3.0;

  const lexical = fluency > 3.0 ? Math.min(6.5, fluency + 0.0) : 3.0;
  const grammar = fluency > 3.0 ? Math.min(6.5, fluency + 0.0) : 3.0;
  const pronunciation = fluency > 3.0 ? Math.min(6.5, fluency + 0.0) : 3.0;

  const band = roundToIeltsBand((fluency + lexical + grammar + pronunciation) / 4);

  return {
    skill: "speaking",
    band,
    details: {
      "Số phần đã ghi âm": `${recordedCount} / ${totalQuestions} câu hỏi`,
      "Tổng thời lượng nói": `${Math.round(totalDuration)} giây`,
      "Part 1 (Phỏng vấn)": `${
        SPEAKING_CONTENT.part1.questions.filter(
          (q) => recordings[q.id]?.hasRecorded,
        ).length
      }/3 câu`,
      "Part 2 (Cue Card)": recordings["part2_cue_card"]?.hasRecorded
        ? "Đã ghi âm bài nói"
        : "Chưa ghi âm",
      "Part 3 (Thảo luận)": `${
        SPEAKING_CONTENT.part3.questions.filter(
          (q) => recordings[q.id]?.hasRecorded,
        ).length
      }/2 câu`,
    },
    criteria: [
      {
        name: "Fluency & Coherence",
        score: fluency,
        description:
          completionRatio >= 0.8
            ? "Hoàn thành hầu hết các phần ghi âm với thời lượng phản xạ tương đối tốt."
            : "Cần tăng cường độ liền mạch và độ dài khi trả lời câu hỏi.",
      },
      {
        name: "Lexical Resource",
        score: lexical,
        description: "Ước lượng độ đa dạng từ vựng trong văn nói.",
      },
      {
        name: "Grammatical Range & Accuracy",
        score: grammar,
        description: "Ước lượng độ chính xác trong cấu trúc câu nói.",
      },
      {
        name: "Pronunciation",
        score: pronunciation,
        description: "Ước lượng ngữ điệu và phát âm cơ bản.",
      },
    ],
    feedback:
      "Demo Estimated Score: Điểm ước lượng dựa trên số lượng và thời lượng bản ghi âm. Hệ thống sẽ tích hợp công nghệ AI nhận diện ngữ âm chuyên sâu trong phiên bản tiếp theo.",
  };
}

/** Compute Full Placement Test Result */
export function calculatePlacementTestResult(
  answers: PlacementTestAnswers,
): PlacementTestResult {
  const listening = scoreListening(answers.listening);
  const reading = scoreReading(answers.reading);
  const writing = scoreWriting(answers.writing);
  const speaking = scoreSpeaking(answers.speakingRecordings);

  const skills: Record<TestSkill, SkillScoreResult> = {
    listening,
    reading,
    writing,
    speaking,
  };

  // Official IELTS overall band: mean of 4 skills rounded if all are valid
  const overallBand =
    listening.band !== null &&
    reading.band !== null &&
    writing.band !== null &&
    speaking.band !== null
      ? roundToIeltsBand(
          (listening.band + reading.band + writing.band + speaking.band) / 4,
        )
      : null;

  const validEntries: [TestSkill, number][] = [];
  if (listening.band !== null) validEntries.push(["listening", listening.band]);
  if (reading.band !== null) validEntries.push(["reading", reading.band]);
  if (writing.band !== null) validEntries.push(["writing", writing.band]);
  if (speaking.band !== null) validEntries.push(["speaking", speaking.band]);

  // Sort descending by band
  validEntries.sort((a, b) => b[1] - a[1]);
  const strongestSkill = validEntries.length > 0 ? validEntries[0][0] : null;
  const weakestSkill = validEntries.length > 0 ? validEntries[validEntries.length - 1][0] : null;

  // Generate learning recommendations based on weakest skill
  const recommendations = generateRecommendations(weakestSkill, overallBand);

  return {
    overallBand,
    skills,
    strongestSkill,
    weakestSkill,
    recommendations,
    submittedAt: new Date().toISOString(),
  };
}

function generateRecommendations(
  weakest: TestSkill | null,
  overallBand: number | null,
): {
  prioritySkill: TestSkill;
  suggestedLevel: string;
  tips: string[];
} {
  const level =
    overallBand === null
      ? "IELTS Diagnostic Review"
      : overallBand < 5.0
        ? "IELTS Foundation (3.5 – 5.0)"
        : overallBand < 6.5
          ? "IELTS Intermediate (5.0 – 6.5)"
          : "IELTS Advanced Intensive (6.5 – 7.5+)";

  const targetSkill = weakest || "writing";

  const tipMap: Record<TestSkill, string[]> = {
    listening: [
      "Luyện tập nghe chính tả (Dictation) hàng ngày từ các nguồn BBC Learning English, TED Talks.",
      "Tập trung cải thiện phản xạ với các bài Part 1 (Form Completion) và Part 4 (Academic Lecture).",
      "Luyện kỹ năng bắt từ khóa (Keywords & Signpost words) trước khi audio bắt đầu phát.",
    ],
    reading: [
      "Áp dụng triệt để phương pháp Skimming (đọc lướt ý chính) và Scanning (tìm từ khóa cụ thể).",
      "Xây dựng sổ tay từ vựng học thuật theo chủ đề (Academic Word List - AWL).",
      "Đặc biệt lưu ý cách phân biệt giữa 'FALSE' (thông tin mâu thuẫn) và 'NOT GIVEN' (không được đề cập).",
    ],
    writing: [
      "Nắm chắc cấu trúc 4 đoạn chuẩn cho IELTS Writing Task 2 (Intro, Body 1, Body 2, Conclusion).",
      "Học các cấu trúc mô tả xu hướng và so sánh số liệu cho Writing Task 1.",
      "Luyện viết đều đặn và kiểm tra thời gian để bảo đảm đạt tối thiểu 150 từ (Task 1) và 250 từ (Task 2).",
    ],
    speaking: [
      "Áp dụng công thức A.R.E.A (Answer - Reason - Example - Alternative) khi trả lời Speaking Part 1 & 3.",
      "Tập thói quen tự ghi âm giọng nói mỗi ngày và nghe lại để chỉnh ngữ điệu và phát âm đuôi.",
      "Luyện phản xạ ghi chú nhanh trong 1 phút chuẩn bị của Speaking Part 2 Cue Card.",
    ],
  };

  return {
    prioritySkill: targetSkill,
    suggestedLevel: level,
    tips: tipMap[targetSkill] || tipMap.listening,
  };
}
