/** Retries temporary provider failures without retrying invalid requests or keys. */
function isTemporaryGeminiFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  // A 429 quota error may last until the daily limit resets. Retrying it
  // immediately cannot help and makes the learner wait through extra calls.
  if (/\b429\b|RESOURCE_EXHAUSTED|quota exceeded/i.test(message)) return false;
  return /\b(500|502|503|504)\b|UNAVAILABLE|high demand/i.test(message);
}

export function geminiFailureMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/\b429\b|RESOURCE_EXHAUSTED|quota exceeded/i.test(message)) {
    return "Gemini đã hết hạn mức chấm điểm của API key/project hôm nay. Vui lòng thử lại sau khi hạn mức được làm mới hoặc dùng project còn hạn mức.";
  }
  if (/\b503\b|UNAVAILABLE|high demand/i.test(message)) {
    return "Gemini đang quá tải tạm thời. Hệ thống đã thử lại tự động; vui lòng thử chấm lại sau ít phút.";
  }
  return fallback;
}

export async function withGeminiRetry<T>(request: () => Promise<T>): Promise<T> {
  let latestError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      latestError = error;
      if (!isTemporaryGeminiFailure(error) || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
    }
  }

  throw latestError;
}
