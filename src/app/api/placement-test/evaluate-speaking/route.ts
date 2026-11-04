import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  GeminiSpeakingOutputSchema,
  type SpeakingAssessmentResponse,
} from "@/lib/placement-ai-types";
import { validateSpeakingInput } from "@/lib/placement-ai-validation";
import { roundToIeltsBand } from "@/lib/placement-scoring";
import { geminiFailureMessage, withGeminiRetry } from "@/lib/gemini-retry";

export const maxDuration = 60; // 60 seconds timeout for audio AI analysis

type SpeakingAudioPayload = {
  recordings: Record<
    string,
    {
      audioBase64?: string;
      mimeType?: string;
      durationSeconds?: number;
      questionPrompt?: string;
      hasRecorded?: boolean;
    }
  >;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as SpeakingAudioPayload;
    const { recordings } = body;

    // 1. Strict Pre-validation (Audio presence, duration >= 3s)
    const validation = validateSpeakingInput(recordings);
    if (!validation.valid) {
      const responsePayload: SpeakingAssessmentResponse = {
        status: validation.status,
        skill: "speaking",
        overallBand: null,
        criteria: null,
        criteriaFeedback: null,
        feedback: null,
        message: validation.message,
      };
      return NextResponse.json(responsePayload, { status: 200 });
    }

    // 2. Check GEMINI_API_KEY
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const responsePayload: SpeakingAssessmentResponse = {
        status: "missing_api_key",
        skill: "speaking",
        overallBand: null,
        criteria: null,
        criteriaFeedback: null,
        feedback: null,
        message:
          "GEMINI_API_KEY chưa được cấu hình trên server. Vui lòng thêm GEMINI_API_KEY vào .env.local để kích hoạt đánh giá AI thực tế.",
      };
      return NextResponse.json(responsePayload, { status: 200 });
    }

    // Filter valid recordings
    const validKeys = Object.keys(recordings).filter((key) => {
      const rec = recordings[key];
      return (
        rec &&
        rec.hasRecorded &&
        Boolean(rec.audioBase64 && rec.audioBase64.length > 50) &&
        (rec.durationSeconds ?? 0) >= 2
      );
    });

    const systemInstruction = `You are a certified senior IELTS Speaking Examiner.
You will listen to the candidate's actual audio recordings across IELTS Speaking Parts 1, 2, and 3.

FIRST, VALIDATE THE AUDITORY RECORDINGS:
1. hasAudibleSpeech: Is there audible human voice speech, or only silence, static, noise, or clicks? (If silent or noise only, mark hasAudibleSpeech = false).
2. isEnglish: Is the candidate speaking English? (If in Vietnamese or other languages, mark isEnglish = false).
3. isRelevant: Is the candidate responding to the questions asked? (If completely random noise or totally off-topic, mark isRelevant = false).

IF NOT VALID:
Return:
{
  "hasAudibleSpeech": false,
  "isEnglish": false,
  "isRelevant": false,
  "rejectionReason": "Clear explanation in Vietnamese why the speaking response cannot be evaluated."
}

IF VALID:
Evaluate strictly according to the 4 official IELTS Speaking Band Descriptors (scale 0.0 - 9.0 in 0.5 increments):
- fluencyAndCoherence: Flow, continuity, natural speech rate, hesitations.
- lexicalResource: Vocabulary range, collocations, precision.
- grammaticalRangeAndAccuracy: Variety and accuracy of grammatical forms.
- pronunciation: Evaluate auditory speech features (stress, rhythm, intonation, phonetic clarity).

Format strictly as JSON conforming to:
{
  "hasAudibleSpeech": true,
  "isEnglish": true,
  "isRelevant": true,
  "criteria": {
    "fluencyAndCoherence": { "score": 6.0, "feedback": "Detailed FC feedback..." },
    "lexicalResource": { "score": 6.0, "feedback": "Detailed LR feedback..." },
    "grammaticalRangeAndAccuracy": { "score": 5.5, "feedback": "Detailed GRA feedback..." },
    "pronunciation": { "score": 6.5, "feedback": "Detailed Pronunciation feedback..." }
  },
  "overallBand": 6.0,
  "transcripts": {
    "questionKey": "Transcribed candidate speech..."
  },
  "strengths": ["Clear pronunciation of consonant clusters...", "..."],
  "weaknesses": ["Hesitation when explaining complex concepts...", "..."],
  "improvements": ["Practice connected speech and linking words...", "..."],
  "evaluationSummary": "Concise summary of candidate's spoken performance."
}`;

    // Assemble multimodal parts for Gemini
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contentParts: any[] = [
      {
        text: `${systemInstruction}\n\nHere are the candidate's audio responses:`,
      },
    ];

    for (const key of validKeys) {
      const item = recordings[key];
      contentParts.push({
        text: `--- Question [${key}] Prompt: "${item.questionPrompt || key}" (Recorded duration: ${item.durationSeconds || 0}s) ---`,
      });

      const rawBase64 = item.audioBase64!.replace(/^data:[^;]+;base64,/, "");
      const mimeType = item.mimeType || "audio/webm";

      contentParts.push({
        inlineData: {
          mimeType,
          data: rawBase64,
        },
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelName = process.env.GEMINI_MODEL || "gemini-3.7-flash";

    const response = await withGeminiRetry(() => ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: contentParts,
        },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    }));

    const responseText = response.text?.trim() || "";
    if (!responseText) {
      throw new Error("Gemini returned empty response for speaking audio.");
    }

    const cleanedJson = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const rawParsed = JSON.parse(cleanedJson);
    const geminiOutput = GeminiSpeakingOutputSchema.parse(rawParsed);

    // If invalid speech, non-English, or silence
    if (
      !geminiOutput.hasAudibleSpeech ||
      !geminiOutput.isEnglish ||
      !geminiOutput.isRelevant ||
      !geminiOutput.criteria
    ) {
      const responsePayload: SpeakingAssessmentResponse = {
        status: "invalid_response",
        skill: "speaking",
        overallBand: null,
        criteria: null,
        criteriaFeedback: null,
        feedback: null,
        message:
          geminiOutput.rejectionReason ||
          "Bản ghi âm không hợp lệ (không phát hiện thấy giọng nói, chỉ có tiếng ồn hoặc không sử dụng tiếng Anh).",
      };
      return NextResponse.json(responsePayload, { status: 200 });
    }

    // Compute official IELTS rounded band
    const c = geminiOutput.criteria;
    const computedOverall = roundToIeltsBand(
      (c.fluencyAndCoherence.score +
        c.lexicalResource.score +
        c.grammaticalRangeAndAccuracy.score +
        c.pronunciation.score) /
        4,
    );

    const successResponse: SpeakingAssessmentResponse = {
      status: "success",
      skill: "speaking",
      overallBand: computedOverall,
      criteria: {
        fluencyAndCoherence: c.fluencyAndCoherence.score,
        lexicalResource: c.lexicalResource.score,
        grammaticalRangeAndAccuracy: c.grammaticalRangeAndAccuracy.score,
        pronunciation: c.pronunciation.score,
      },
      criteriaFeedback: {
        fluencyAndCoherence: c.fluencyAndCoherence.feedback,
        lexicalResource: c.lexicalResource.feedback,
        grammaticalRangeAndAccuracy: c.grammaticalRangeAndAccuracy.feedback,
        pronunciation: c.pronunciation.feedback,
      },
      feedback: {
        strengths: geminiOutput.strengths,
        weaknesses: geminiOutput.weaknesses,
        improvements: geminiOutput.improvements,
        summary: geminiOutput.evaluationSummary || "Đã hoàn thành đánh giá bài nói theo tiêu chuẩn IELTS.",
      },
      transcripts: geminiOutput.transcripts,
    };

    return NextResponse.json(successResponse, { status: 200 });
  } catch (error) {
    console.error("evaluate-speaking API error:", error);
    const message = error instanceof Error ? error.message : "Internal evaluation error";

    const errorPayload: SpeakingAssessmentResponse = {
      status: "api_error",
      skill: "speaking",
      overallBand: null,
      criteria: null,
      criteriaFeedback: null,
      feedback: null,
      message: geminiFailureMessage(error, "Không thể hoàn thành đánh giá bài nói qua Gemini API. Vui lòng kiểm tra cấu hình và thử lại."),
      error: message,
    };
    return NextResponse.json(errorPayload, { status: 200 });
  }
}
