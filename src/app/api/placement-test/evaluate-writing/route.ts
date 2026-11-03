import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  GeminiWritingOutputSchema,
  type WritingAssessmentResponse,
} from "@/lib/placement-ai-types";
import { validateWritingInput } from "@/lib/placement-ai-validation";
import { countWords, roundToIeltsBand } from "@/lib/placement-scoring";

export const maxDuration = 60; // 60 seconds timeout for AI evaluation

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { essay, prompt } = body;

    const wordCount = countWords(essay || "");

    // 1. Strict Pre-validation (Language, Gibberish, Length)
    const validation = validateWritingInput(essay);
    if (!validation.valid) {
      const responsePayload: WritingAssessmentResponse = {
        status: validation.status,
        skill: "writing",
        overallBand: null,
        criteria: null,
        criteriaFeedback: null,
        feedback: null,
        wordCount,
        message: validation.message,
      };
      return NextResponse.json(responsePayload, { status: 200 });
    }

    // 2. Check GEMINI_API_KEY
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const responsePayload: WritingAssessmentResponse = {
        status: "missing_api_key",
        skill: "writing",
        overallBand: null,
        criteria: null,
        criteriaFeedback: null,
        feedback: null,
        wordCount,
        message:
          "GEMINI_API_KEY chưa được cấu hình trên server. Vui lòng thêm GEMINI_API_KEY vào .env.local để kích hoạt đánh giá AI thực tế.",
      };
      return NextResponse.json(responsePayload, { status: 200 });
    }

    // 3. Prepare Prompt for Gemini
    const taskPrompt =
      prompt ||
      "In the modern era, artificial intelligence (AI) is transforming various industries. Some people believe that AI will create more jobs and economic growth, while others argue that it will lead to widespread unemployment and social inequality. Discuss both views and give your own opinion. (Write at least 250 words)";

    const systemInstruction = `You are a certified senior IELTS Academic Examiner.
You will evaluate the candidate's IELTS Writing Task 2 essay.

FIRST, VALIDATE THE SUBMISSION:
1. Is it written in English? (If in Vietnamese or any other language, mark isValidEnglishEssay = false).
2. Does it respond to the prompt topic (AI impact on jobs/economy)? (If completely off-topic or spam, mark isRelevantToTopic = false).
3. Is it meaningful content with communicative value? (If gibberish, copy-pasting or random words, mark isMeaningfulContent = false).

IF NOT VALID:
Return:
{
  "isValidEnglishEssay": false,
  "isRelevantToTopic": false,
  "isMeaningfulContent": false,
  "rejectionReason": "Clear explanation in Vietnamese why the essay cannot be assessed."
}

IF VALID:
Evaluate strictly according to the 4 official IELTS Writing Task 2 Band Descriptors (scale 0.0 - 9.0 in 0.5 increments):
- taskResponse: Addressing prompt, stance, depth of ideas. If under 250 words, reflect appropriately in TR, but evaluate content fairly.
- coherenceAndCohesion: Paragraphing, flow, logical progression, cohesive devices.
- lexicalResource: Academic vocabulary, collocations, precision, spelling.
- grammaticalRangeAndAccuracy: Sentence variety, accuracy, punctuation.

Format strictly as JSON conforming to:
{
  "isValidEnglishEssay": true,
  "isRelevantToTopic": true,
  "isMeaningfulContent": true,
  "criteria": {
    "taskResponse": { "score": 6.5, "feedback": "Detailed feedback..." },
    "coherenceAndCohesion": { "score": 6.0, "feedback": "Detailed feedback..." },
    "lexicalResource": { "score": 6.5, "feedback": "Detailed feedback..." },
    "grammaticalRangeAndAccuracy": { "score": 6.0, "feedback": "Detailed feedback..." }
  },
  "overallBand": 6.5,
  "strengths": ["Clear viewpoint...", "..."],
  "weaknesses": ["Lacks development in body 2...", "..."],
  "improvements": ["Use more precise academic collocations...", "..."],
  "evaluationSummary": "Concise summary of candidate performance."
}`;

    const userContent = `Task Prompt:
"""
${taskPrompt}
"""

Candidate Response (${wordCount} words):
"""
${essay.trim()}
"""`;

    const ai = new GoogleGenAI({ apiKey });
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemInstruction}\n\n${userContent}` }],
        },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const responseText = response.text?.trim() || "";
    if (!responseText) {
      throw new Error("Gemini returned empty response text.");
    }

    const cleanedJson = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const rawParsed = JSON.parse(cleanedJson);
    const geminiOutput = GeminiWritingOutputSchema.parse(rawParsed);

    // If Gemini determined invalid language, off-topic, or meaningless
    if (
      !geminiOutput.isValidEnglishEssay ||
      !geminiOutput.isRelevantToTopic ||
      !geminiOutput.isMeaningfulContent ||
      !geminiOutput.criteria
    ) {
      const responsePayload: WritingAssessmentResponse = {
        status: "invalid_response",
        skill: "writing",
        overallBand: null,
        criteria: null,
        criteriaFeedback: null,
        feedback: null,
        wordCount,
        message:
          geminiOutput.rejectionReason ||
          "Bài viết không hợp lệ (không phải tiếng Anh, lạc đề hoặc không có ý nghĩa học thuật).",
      };
      return NextResponse.json(responsePayload, { status: 200 });
    }

    // Compute official IELTS mean of the 4 criteria
    const c = geminiOutput.criteria;
    const computedOverall = roundToIeltsBand(
      (c.taskResponse.score +
        c.coherenceAndCohesion.score +
        c.lexicalResource.score +
        c.grammaticalRangeAndAccuracy.score) /
        4,
    );

    const successResponse: WritingAssessmentResponse = {
      status: "success",
      skill: "writing",
      overallBand: computedOverall,
      criteria: {
        taskResponse: c.taskResponse.score,
        coherenceAndCohesion: c.coherenceAndCohesion.score,
        lexicalResource: c.lexicalResource.score,
        grammaticalRangeAndAccuracy: c.grammaticalRangeAndAccuracy.score,
      },
      criteriaFeedback: {
        taskResponse: c.taskResponse.feedback,
        coherenceAndCohesion: c.coherenceAndCohesion.feedback,
        lexicalResource: c.lexicalResource.feedback,
        grammaticalRangeAndAccuracy: c.grammaticalRangeAndAccuracy.feedback,
      },
      feedback: {
        strengths: geminiOutput.strengths,
        weaknesses: geminiOutput.weaknesses,
        improvements: geminiOutput.improvements,
        summary: geminiOutput.evaluationSummary || "Đã hoàn thành đánh giá bài viết theo tiêu chuẩn IELTS.",
      },
      wordCount,
    };

    return NextResponse.json(successResponse, { status: 200 });
  } catch (error) {
    console.error("evaluate-writing API error:", error);
    const message = error instanceof Error ? error.message : "Internal evaluation error";

    const errorPayload: WritingAssessmentResponse = {
      status: "api_error",
      skill: "writing",
      overallBand: null,
      criteria: null,
      criteriaFeedback: null,
      feedback: null,
      message: "Không thể hoàn thành đánh giá bài viết qua Gemini API do lỗi kết nối.",
      error: message,
    };
    return NextResponse.json(errorPayload, { status: 200 });
  }
}
