import type {
  SpeakingAssessmentResponse,
  WritingAssessmentResponse,
} from "./placement-ai-types.ts";

const MOCK_PROVIDER = "mock";
const MOCK_MODEL = "development-mock-v1";
const DISCLOSURE =
  "Điểm mô phỏng chỉ dùng để kiểm thử luồng học tập ở môi trường development; không phải kết quả do AI chấm.";

type MockEnvironment = {
  nodeEnv?: string;
  mode?: string;
};

/**
 * Mock assessments are intentionally unavailable outside local development.
 * Keeping this decision on the server means a browser cannot enable it itself.
 */
export function isMockAiEvaluationEnabled(
  environment: MockEnvironment = {
    nodeEnv: process.env.NODE_ENV,
    mode: process.env.AI_EVALUATION_MODE,
  },
) {
  return (
    environment.nodeEnv === "development" &&
    environment.mode?.trim().toLowerCase() === "mock"
  );
}

export function createMockWritingAssessment(
  wordCount: number,
): WritingAssessmentResponse {
  const fullLength = wordCount >= 250;
  const overallBand = fullLength ? 5.5 : 5.0;

  return {
    status: "success",
    skill: "writing",
    overallBand,
    wordCount,
    provider: MOCK_PROVIDER,
    modelUsed: MOCK_MODEL,
    message: DISCLOSURE,
    criteria: {
      taskResponse: fullLength ? 5.5 : 5.0,
      coherenceAndCohesion: 5.0,
      lexicalResource: 5.0,
      grammaticalRangeAndAccuracy: fullLength ? 5.5 : 5.0,
    },
    criteriaFeedback: {
      taskResponse: "Điểm mô phỏng development: hãy dùng bài chấm AI thật để nhận feedback theo nội dung.",
      coherenceAndCohesion: "Điểm mô phỏng development: kiểm tra lại bố cục đoạn văn khi chấm thật.",
      lexicalResource: "Điểm mô phỏng development: chưa phân tích vốn từ thực tế.",
      grammaticalRangeAndAccuracy:
        "Điểm mô phỏng development: chưa phân tích lỗi ngữ pháp thực tế.",
    },
    feedback: {
      strengths: ["Đã gửi bài Writing hợp lệ để hoàn tất luồng kiểm thử."],
      weaknesses: ["Không sử dụng điểm mô phỏng để đánh giá trình độ thật."],
      improvements: ["Tắt AI_EVALUATION_MODE=mock để dùng đánh giá AI thật."],
      summary: DISCLOSURE,
    },
  };
}

export function createMockSpeakingAssessment(
  recordingCount: number,
): SpeakingAssessmentResponse {
  const enoughSamples = recordingCount >= 3;
  const overallBand = enoughSamples ? 5.5 : 5.0;

  return {
    status: "success",
    skill: "speaking",
    overallBand,
    provider: MOCK_PROVIDER,
    modelUsed: MOCK_MODEL,
    message: DISCLOSURE,
    criteria: {
      fluencyAndCoherence: overallBand,
      lexicalResource: 5.0,
      grammaticalRangeAndAccuracy: 5.0,
      pronunciation: enoughSamples ? 5.5 : 5.0,
    },
    criteriaFeedback: {
      fluencyAndCoherence:
        "Điểm mô phỏng development: chưa phân tích độ trôi chảy của bản ghi âm.",
      lexicalResource:
        "Điểm mô phỏng development: chưa phân tích vốn từ của bản ghi âm.",
      grammaticalRangeAndAccuracy:
        "Điểm mô phỏng development: chưa phân tích ngữ pháp của bản ghi âm.",
      pronunciation:
        "Điểm mô phỏng development: chưa phân tích phát âm của bản ghi âm.",
    },
    feedback: {
      strengths: ["Đã gửi bản ghi âm hợp lệ để hoàn tất luồng kiểm thử."],
      weaknesses: ["Không sử dụng điểm mô phỏng để đánh giá trình độ thật."],
      improvements: ["Tắt AI_EVALUATION_MODE=mock để dùng đánh giá AI thật."],
      summary: DISCLOSURE,
    },
  };
}
