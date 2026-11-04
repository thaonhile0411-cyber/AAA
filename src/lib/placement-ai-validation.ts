import { countWords, roundToIeltsBand } from "./placement-scoring.ts";
import type { AssessmentStatus } from "./placement-ai-types.ts";

// Vietnamese accented character regex
const VIETNAMESE_ACCENT_REGEX =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

// Common Vietnamese words without accents that might appear
const COMMON_UNACCENTED_VIETNAMESE = new Set([
  "toi", "la", "nguoi", "hoc", "sinh", "sinh", "vien", "viet", "nam", "va",
  "nhung", "thi", "ma", "o", "trong", "co", "khong", "duoc", "nay", "kia",
]);

export type InputValidationResult = {
  valid: boolean;
  status: AssessmentStatus;
  message?: string;
};

/**
 * Validates writing response before calling Gemini API
 */
export function validateWritingInput(rawText: string | undefined | null): InputValidationResult {
  if (!rawText || typeof rawText !== "string") {
    return {
      valid: false,
      status: "insufficient_response",
      message: "Nội dung bài viết không được để trống.",
    };
  }

  const trimmed = rawText.trim();
  if (!trimmed) {
    return {
      valid: false,
      status: "insufficient_response",
      message: "Nội dung bài viết không được để trống.",
    };
  }

  const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);

  // Check 1: Repeated character gibberish (e.g. "aaaaaaa", "asdfasdfasdfasdf")
  if (/(.)\1{5,}/.test(trimmed) || /([a-z0-9]{2,8})\1{4,}/i.test(trimmed)) {
    return {
      valid: false,
      status: "invalid_response",
      message: "Bài viết chứa các chuỗi ký tự lặp lại vô nghĩa (gibberish/spam).",
    };
  }

  // Check 2: Words with excessive length (> 35 characters)
  const hasExcessiveWord = words.some((w) => w.length > 35);
  if (hasExcessiveWord) {
    return {
      valid: false,
      status: "invalid_response",
      message: "Bài viết chứa từ có độ dài bất thường không có trong từ điển tiếng Anh.",
    };
  }

  // Check 3: Vietnamese language detection
  let vietnameseCharCount = 0;
  for (const char of trimmed) {
    if (VIETNAMESE_ACCENT_REGEX.test(char)) {
      vietnameseCharCount++;
    }
  }

  const unaccentedVietnameseCount = words.filter((w) =>
    COMMON_UNACCENTED_VIETNAMESE.has(w),
  ).length;

  if (vietnameseCharCount > 5 || (words.length > 10 && unaccentedVietnameseCount / words.length > 0.4)) {
    return {
      valid: false,
      status: "invalid_response",
      message:
        "Bài viết phát hiện sử dụng tiếng Việt. Bài thi IELTS Academic Writing Task 2 bắt buộc phải được viết hoàn toàn bằng tiếng Anh.",
    };
  }

  // Check 4: Insufficient length (under 20 words cannot be assessed as an IELTS essay)
  const wordCount = countWords(trimmed);
  if (wordCount < 20) {
    return {
      valid: false,
      status: "insufficient_response",
      message: `Bài viết chỉ có ${wordCount} từ, quá ngắn để đánh giá năng lực IELTS Task 2 (yêu cầu bài viết hoàn chỉnh tối thiểu 250 từ).`,
    };
  }

  // Check 5: Spamming the exact same word repeatedly
  if (words.length >= 25) {
    const uniqueWords = new Set(words);
    const diversityRatio = uniqueWords.size / words.length;
    if (diversityRatio < 0.18) {
      return {
        valid: false,
        status: "invalid_response",
        message: "Bài viết lặp lại cùng một từ ngữ quá nhiều lần mà không tạo thành luận điểm có ý nghĩa.",
      };
    }
  }

  // Check 6: Check that words contain standard vowels (a, e, i, o, u, y)
  const nonVowelWords = words.filter((w) => w.length >= 4 && !/[aeiouy]/i.test(w));
  if (nonVowelWords.length >= 3) {
    return {
      valid: false,
      status: "invalid_response",
      message: "Bài viết chứa nhiều từ không có nguyên âm tiếng Anh hợp lệ.",
    };
  }

  return {
    valid: true,
    status: "success",
  };
}

/**
 * Strips data URI prefix (including codecs) and whitespace to return clean raw base64
 */
export function sanitizeAudioBase64(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim();
  const commaIdx = trimmed.indexOf(",");
  if (commaIdx !== -1 && trimmed.slice(0, commaIdx).includes("base64")) {
    return trimmed.slice(commaIdx + 1).replace(/\s/g, "");
  }
  return trimmed.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
}

/**
 * Normalizes audio MIME type to clean standard types supported by Gemini (without codecs parameters)
 */
export function sanitizeAudioMimeType(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "audio/webm";
  const base = raw.split(";")[0].trim().toLowerCase();
  if (base.includes("webm")) return "audio/webm";
  if (base.includes("mp4") || base.includes("m4a") || base.includes("aac")) return "audio/mp4";
  if (base.includes("wav")) return "audio/wav";
  if (base.includes("mp3") || base.includes("mpeg")) return "audio/mp3";
  if (base.includes("ogg")) return "audio/ogg";
  return "audio/webm";
}

/**
 * Validates speaking recordings before calling Gemini API
 */
export function validateSpeakingInput(
  recordings: Record<
    string,
    {
      hasRecorded?: boolean;
      durationSeconds?: number;
      audioBase64?: string;
    } | undefined
  >,
): InputValidationResult {
  if (!recordings || typeof recordings !== "object" || Object.keys(recordings).length === 0) {
    return {
      valid: false,
      status: "insufficient_response",
      message: "Chưa có bản ghi âm Speaking nào được gửi lên.",
    };
  }

  const recordedEntries = Object.entries(recordings).filter(([, v]) => {
    if (!v?.hasRecorded || !v?.audioBase64) return false;
    const clean = sanitizeAudioBase64(v.audioBase64);
    return clean.length > 20 && !clean.startsWith("blob:");
  });

  if (recordedEntries.length === 0) {
    return {
      valid: false,
      status: "insufficient_response",
      message: "Không tìm thấy dữ liệu âm thanh hợp lệ trong các phần ghi âm.",
    };
  }

  // Check minimum duration: at least one recording must be >= 3 seconds
  const validDurations = recordedEntries.filter(
    ([, v]) => (v?.durationSeconds ?? 0) >= 3,
  );

  if (validDurations.length === 0) {
    return {
      valid: false,
      status: "insufficient_response",
      message: "Các bản ghi âm quá ngắn (dưới 3 giây) hoặc chỉ chứa sự im lặng, không đủ để phân tích phát âm và độ trôi chảy.",
    };
  }

  return {
    valid: true,
    status: "success",
  };
}

/**
 * Calculates Overall Band ONLY when all 4 skills have valid, non-null scores.
 * Returns null if any skill has not been successfully evaluated!
 */
export function calculateOverallIeltsBand(skills: {
  listening: number | null | undefined;
  reading: number | null | undefined;
  writing: number | null | undefined;
  speaking: number | null | undefined;
}): number | null {
  const { listening, reading, writing, speaking } = skills;

  if (
    listening === null ||
    listening === undefined ||
    isNaN(listening) ||
    reading === null ||
    reading === undefined ||
    isNaN(reading) ||
    writing === null ||
    writing === undefined ||
    isNaN(writing) ||
    speaking === null ||
    speaking === undefined ||
    isNaN(speaking)
  ) {
    return null;
  }

  // All 4 skills must have positive band scores
  if (listening < 1.0 || reading < 1.0 || writing < 1.0 || speaking < 1.0) {
    return null;
  }

  const mean = (listening + reading + writing + speaking) / 4;
  return roundToIeltsBand(mean);
}

