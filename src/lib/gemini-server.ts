import { GoogleGenAI, ApiError } from "@google/genai";
import { z } from "zod";
import type { AssessmentStatus } from "./placement-ai-types.ts";

export type GeminiServerConfig = {
  apiKey: string;
  model: string;
};

export type GeminiConfigResult =
  | { ok: true; config: GeminiServerConfig }
  | {
      ok: false;
      errorType: AssessmentStatus;
      message: string;
      httpStatus: number;
    };

export type GeminiErrorCategory = {
  status: AssessmentStatus;
  message: string;
  isTransient: boolean;
  httpStatus: number;
  technicalError?: string;
};

/**
 * Known placeholder strings in sample env configs that are not valid keys
 */
const PLACEHOLDER_KEYS = new Set([
  "your-gemini-api-key",
  "your-api-key",
  "your_gemini_api_key",
  "your_api_key_here",
  "aizasy...",
  "dummy_key",
  "placeholder",
]);

export const DEFAULT_GEMINI_MODEL = "gemini-flash-lite-latest";

/**
 * Returns centralized Gemini model name, auto-upgrading deprecated models like gemini-2.5-flash
 */
export function getCentralGeminiModel(): string {
  const envModel = process.env.GEMINI_MODEL?.trim().replace(/^["']|["']$/g, "");
  if (
    !envModel ||
    envModel === "gemini-2.5-flash" ||
    envModel === "gemini-2.5-flash-lite"
  ) {
    return DEFAULT_GEMINI_MODEL;
  }
  return envModel;
}

/**
 * Validates and retrieves Gemini API configuration exclusively on server.
 * Checks GEMINI_API_KEY with fallback to GOOGLE_API_KEY and GOOGLE_GENAI_API_KEY.
 * Never exposes keys to client.
 */
export function getGeminiServerConfig(): GeminiConfigResult {
  const rawKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;

  if (!rawKey || typeof rawKey !== "string") {
    return {
      ok: false,
      errorType: "missing_api_key",
      message:
        "GEMINI_API_KEY chưa được cấu hình trên server. Vui lòng thêm GEMINI_API_KEY vào .env.local để kích hoạt đánh giá AI thực tế.",
      httpStatus: 200,
    };
  }

  // Strip surrounding quotes and whitespace
  const sanitizedKey = rawKey.trim().replace(/^["']|["']$/g, "");

  if (
    !sanitizedKey ||
    sanitizedKey.length < 15 ||
    PLACEHOLDER_KEYS.has(sanitizedKey.toLowerCase())
  ) {
    return {
      ok: false,
      errorType: "invalid_api_key",
      message:
        "GEMINI_API_KEY hiện tại là placeholder hoặc có định dạng không hợp lệ. Vui lòng cung cấp API key hợp lệ từ Google AI Studio trong .env.local.",
      httpStatus: 200,
    };
  }

  const model = getCentralGeminiModel();

  return {
    ok: true,
    config: {
      apiKey: sanitizedKey,
      model,
    },
  };
}

/**
 * Categorizes errors thrown during Gemini API communication.
 * Distinguishes authentication, quota, transient network, and model errors.
 */
export function categorizeGeminiError(error: unknown): GeminiErrorCategory {
  let status: AssessmentStatus = "api_error";
  let message = "Không thể hoàn thành đánh giá qua Gemini API do lỗi máy chủ.";
  let isTransient = false;
  let httpStatus = 500;
  let technicalError: string | undefined;

  if (error instanceof Error) {
    technicalError = error.message;
  } else if (typeof error === "string") {
    technicalError = error;
  }

  const errStatus =
    error instanceof ApiError
      ? error.status
      : (error as { status?: number; statusCode?: number })?.status ||
        (error as { status?: number; statusCode?: number })?.statusCode;

  const msgLower = (technicalError || "").toLowerCase();

  // 1. Authentication / Permission errors (401, 403, API_KEY_INVALID)
  if (
    errStatus === 401 ||
    errStatus === 403 ||
    msgLower.includes("api_key_invalid") ||
    msgLower.includes("api key not valid") ||
    msgLower.includes("unauthenticated") ||
    msgLower.includes("permission_denied") ||
    msgLower.includes("forbidden")
  ) {
    status = "invalid_api_key";
    message =
      "GEMINI_API_KEY không hợp lệ hoặc đã hết hạn (Lỗi xác thực 401/403). Vui lòng kiểm tra lại API key trên Google AI Studio.";
    isTransient = false;
    httpStatus = 401;
  }
  // 2. Quota / Rate limit errors (429, RESOURCE_EXHAUSTED)
  else if (
    errStatus === 429 ||
    msgLower.includes("resource_exhausted") ||
    msgLower.includes("quota") ||
    msgLower.includes("rate limit") ||
    msgLower.includes("too many requests")
  ) {
    status = "quota_exceeded";
    message =
      "Đã vượt quá giới hạn lượt gọi Gemini API (HTTP 429 Quota Exceeded). Vui lòng đợi khoảng 30 giây rồi bấm 'Thử chấm lại với AI'.";
    isTransient = true;
    httpStatus = 429;
  }
  // 3. Request timeout (AbortError, ETIMEDOUT, deadline exceeded)
  else if (
    (error instanceof Error && error.name === "AbortError") ||
    msgLower.includes("timeout") ||
    msgLower.includes("etimedout") ||
    msgLower.includes("deadline_exceeded")
  ) {
    status = "timeout";
    message =
      "Hết thời gian chờ phản hồi từ máy chủ Gemini (Request Timeout sau 35s). Vui lòng kiểm tra kết nối mạng và thử lại.";
    isTransient = true;
    httpStatus = 504;
  }
  // 4. Model not found (404)
  else if (errStatus === 404 || msgLower.includes("model not found") || msgLower.includes("not_found")) {
    status = "model_error";
    message =
      "Mô hình Gemini được cấu hình không tồn tại hoặc tài khoản chưa được cấp quyền truy cập.";
    isTransient = false;
    httpStatus = 404;
  }
  // 5. Bad request / Invalid argument (400)
  else if (errStatus === 400 || msgLower.includes("invalid_argument")) {
    status = "model_error";
    message =
      "Yêu cầu gửi đến Gemini API không hợp lệ hoặc kích thước âm thanh/văn bản vượt quá giới hạn.";
    isTransient = false;
    httpStatus = 400;
  }
  // 6. Transient server-side errors (500, 503, UNAVAILABLE, fetch failed)
  else if (
    errStatus === 500 ||
    errStatus === 503 ||
    errStatus === 502 ||
    msgLower.includes("unavailable") ||
    msgLower.includes("internal error") ||
    msgLower.includes("fetch failed") ||
    msgLower.includes("econnreset")
  ) {
    status = "api_error";
    message =
      "Máy chủ Gemini hiện đang bận hoặc tạm thời gián đoạn (5xx). Vui lòng bấm 'Thử chấm lại với AI'.";
    isTransient = true;
    httpStatus = 503;
  }

  return {
    status,
    message,
    isTransient,
    httpStatus,
    technicalError,
  };
}

export type CallGeminiOptions<T> = {
  apiKey: string;
  model: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contents: any[];
  schema: z.ZodType<T>;
  systemInstruction?: string;
  timeoutMs?: number;
  maxRetries?: number;
};

export type CallGeminiResult<T> =
  | { success: true; data: T; durationMs: number }
  | {
      success: false;
      status: AssessmentStatus;
      message: string;
      httpStatus: number;
      errorDetails?: string;
    };

/**
 * Calls Gemini API with timeout, exponential backoff with jitter for transient errors,
 * strict schema validation, and secure server-side logging.
 */
export async function callGeminiWithRetry<T>(
  options: CallGeminiOptions<T>,
): Promise<CallGeminiResult<T>> {
  const {
    apiKey,
    model,
    contents,
    schema,
    timeoutMs = 35000,
    maxRetries = 2,
  } = options;

  const ai = new GoogleGenAI({ apiKey });
  const totalAttempts = 1 + Math.max(0, maxRetries);

  let lastCategorizedError: GeminiErrorCategory | null = null;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    const startTime = Date.now();

    try {
      console.log(
        `[Gemini API] Invoking model: ${model} (Attempt ${attempt}/${totalAttempts}, API version: v1beta, endpoint: generateContent)`,
      );

      // Setup timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort(new Error(`Gemini request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      // Execute Gemini call with timeout race
      const generatePromise = ai.models.generateContent({
        model,
        contents,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
          abortSignal: controller.signal,
        },
      });

      const response = await Promise.race([
        generatePromise,
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(controller.signal.reason || new Error("Request aborted"));
          });
        }),
      ]);

      clearTimeout(timeoutId);

      const responseText = response.text?.trim() || "";
      if (!responseText) {
        throw new Error("Gemini returned empty response text.");
      }

      // Clean Markdown code fence wrapper if present
      const cleanedJson = responseText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(cleanedJson);
      } catch (jsonErr) {
        console.warn(
          `[Gemini Server] Attempt ${attempt} failed to parse JSON response. Response length: ${cleanedJson.length}`,
        );
        return {
          success: false,
          status: "invalid_json",
          message:
            "Phản hồi từ AI không đúng định dạng JSON chuẩn. Vui lòng bấm 'Thử chấm lại với AI'.",
          httpStatus: 502,
          errorDetails: jsonErr instanceof Error ? jsonErr.message : "JSON parse error",
        };
      }

      // Validate against Zod schema
      const parseResult = schema.safeParse(parsedJson);
      if (!parseResult.success) {
        console.warn(
          `[Gemini Server] Attempt ${attempt} failed schema validation:`,
          parseResult.error.format(),
        );
        return {
          success: false,
          status: "invalid_json",
          message:
            "Cấu trúc kết quả đánh giá từ AI không khớp với tiêu chuẩn chấm điểm IELTS. Vui lòng bấm 'Thử chấm lại với AI'.",
          httpStatus: 502,
          errorDetails: parseResult.error.message,
        };
      }

      const durationMs = Date.now() - startTime;
      return {
        success: true,
        data: parseResult.data,
        durationMs,
      };
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      const categorized = categorizeGeminiError(err);
      lastCategorizedError = categorized;

      // Safe logging without leaking secrets or payload data
      console.warn(
        `[Gemini Server] Attempt ${attempt}/${totalAttempts} failed after ${durationMs}ms: [${categorized.status}] ${categorized.technicalError?.slice(0, 150)}`,
      );

      // Do NOT retry non-transient errors (e.g. 401 invalid key, 400 bad request)
      if (!categorized.isTransient || attempt >= totalAttempts) {
        break;
      }

      // Exponential backoff with jitter for transient errors
      const baseDelay = Math.min(3000, Math.pow(2, attempt) * 1000);
      const jitter = Math.random() * 500;
      const delayMs = baseDelay + jitter;

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const finalError = lastCategorizedError || {
    status: "api_error" as AssessmentStatus,
    message: "Không thể kết nối đến máy chủ Gemini AI sau nhiều lần thử.",
    httpStatus: 500,
    isTransient: false,
  };

  return {
    success: false,
    status: finalError.status,
    message: finalError.message,
    httpStatus: finalError.httpStatus,
    errorDetails: finalError.technicalError,
  };
}

