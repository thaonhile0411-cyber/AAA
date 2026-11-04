import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateOverallIeltsBand,
  validateSpeakingInput,
  validateWritingInput,
} from "../src/lib/placement-ai-validation.ts";
import {
  GeminiSpeakingOutputSchema,
  GeminiWritingOutputSchema,
} from "../src/lib/placement-ai-types.ts";

// ==========================================
// 1. WRITING VALIDATION TEST CASES
// ==========================================

test("Writing: Valid English essay passes validation", () => {
  const validEssay = `
    In recent years, the advancement of artificial intelligence and automation has transformed the global workforce.
    Many individuals argue that traditional classroom learning will soon be superseded by intelligent online platforms.
    In my opinion, while digital systems provide unparalleled flexibility and personalized curricula, the collaborative
    atmosphere and emotional mentorship provided by human instructors remain irreplaceable.

    On the one hand, technological solutions allow learners from remote areas to access high-quality educational materials
    without geographic constraints. For instance, self-paced courses and adaptive algorithms enable students to master
    challenging concepts at their own speed. Furthermore, interactive simulations enhance retention by providing immediate
    feedback on practice exercises.

    On the other hand, comprehensive education entails social development and ethical reasoning, areas where automated
    software often falls short. Experienced educators not only deliver academic content but also inspire critical thinking,
    empathy, and resilience among peers. Group discussions and real-time debates foster teamwork and public speaking skills,
    which are essential attributes for professional life.

    In conclusion, although technological tools serve as powerful catalysts for educational accessibility, they should
    complement rather than completely replace classroom teaching. A blended pedagogical approach represents the ideal
    path forward for future generations.
  `;

  const result = validateWritingInput(validEssay);
  assert.equal(result.valid, true);
  assert.equal(result.status, "success");
});

test("Writing: Vietnamese essay is rejected with invalid_response and no band score", () => {
  const vietnameseEssay = `
    Tôi nghĩ rằng việc học đại học là vô cùng quan trọng đối với tương lai của mỗi người trẻ hiện nay.
    Khi bước vào giảng đường đại học, sinh viên không chỉ được tiếp thu các kiến thức chuyên ngành sâu rộng
    mà còn có cơ hội rèn luyện những kỹ năng mềm thiết yếu như kỹ năng thuyết trình, làm việc nhóm và tư duy phản biện.
    Hơn thế nữa, môi trường đại học mở ra nhiều mối quan hệ bổ ích cho sự nghiệp lâu dài sau này.
  `;

  const result = validateWritingInput(vietnameseEssay);
  assert.equal(result.valid, false);
  assert.equal(result.status, "invalid_response");
  assert.ok(result.message?.includes("tiếng Việt"));
});

test("Writing: Gibberish character spam (e.g. aaaaaaa, asdfasdfasdfasdf) is rejected with invalid_response", () => {
  const charSpam = "aaaaaaa bbbbbbb ccccccc ddddddd eeeeeee fffffff ggggggg hhhhhhh iiiiiii jjjjjjj kkkkkkk lllllll";
  const result1 = validateWritingInput(charSpam);
  assert.equal(result1.valid, false);
  assert.equal(result1.status, "invalid_response");

  const patternSpam = "asdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdf";
  const result2 = validateWritingInput(patternSpam);
  assert.equal(result2.valid, false);
  assert.equal(result2.status, "invalid_response");
});

test("Writing: Single word or text under 20 words is rejected with insufficient_response", () => {
  const singleWord = "hello";
  const result1 = validateWritingInput(singleWord);
  assert.equal(result1.valid, false);
  assert.equal(result1.status, "insufficient_response");

  const shortText = "I think technology is good for study because it is fast and easy to use today.";
  const result2 = validateWritingInput(shortText);
  assert.equal(result2.valid, false);
  assert.equal(result2.status, "insufficient_response");
  assert.ok(result2.message?.includes("quá ngắn"));
});

test("Writing: Repeated word spam (low lexical diversity) is rejected with invalid_response", () => {
  const repeatedSpam = Array(35).fill("the book").join(" ");
  const result = validateWritingInput(repeatedSpam);
  assert.equal(result.valid, false);
  assert.equal(result.status, "invalid_response");
  assert.ok(result.message?.includes("lặp lại cùng một từ ngữ"));
});

test("Writing: Empty, blank, or null text is rejected with insufficient_response", () => {
  assert.equal(validateWritingInput("").status, "insufficient_response");
  assert.equal(validateWritingInput("   \n\t  ").status, "insufficient_response");
  assert.equal(validateWritingInput(null).status, "insufficient_response");
  assert.equal(validateWritingInput(undefined).status, "insufficient_response");
});

test("Writing: Schema validates Gemini structured rejection response without generating a fake band", () => {
  const rejectionFromAi = {
    isValidEnglishEssay: false,
    isRelevantToTopic: false,
    isMeaningfulContent: false,
    rejectionReason: "Content is written in Vietnamese, not academic English.",
    strengths: [],
    weaknesses: [],
    improvements: ["Rewrite entirely in English addressing the Task 2 prompt."],
  };

  const parsed = GeminiWritingOutputSchema.safeParse(rejectionFromAi);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.isValidEnglishEssay, false);
    assert.equal(parsed.data.overallBand, undefined);
  }
});

// ==========================================
// 2. SPEAKING VALIDATION TEST CASES
// ==========================================

test("Speaking: Empty recordings or missing audio is rejected with insufficient_response", () => {
  const emptyObj = {};
  const result1 = validateSpeakingInput(emptyObj);
  assert.equal(result1.valid, false);
  assert.equal(result1.status, "insufficient_response");

  const unrecordedObj = {
    S1: { hasRecorded: false, durationSeconds: 0, audioBase64: "" },
    part2_cue_card: { hasRecorded: false, durationSeconds: 0, audioBase64: "" },
  };
  const result2 = validateSpeakingInput(unrecordedObj);
  assert.equal(result2.valid, false);
  assert.equal(result2.status, "insufficient_response");
});

test("Speaking: Recording under 3 seconds is rejected with insufficient_response", () => {
  const shortAudio = {
    S1: {
      hasRecorded: true,
      durationSeconds: 2,
      audioBase64: "data:audio/webm;base64,GkXfo59ChoEBQveBAULygQ8tGAEAEU9",
    },
    S2: {
      hasRecorded: true,
      durationSeconds: 1,
      audioBase64: "data:audio/webm;base64,GkXfo59ChoEBQveBAULygQ8tGAEAEU9",
    },
  };

  const result = validateSpeakingInput(shortAudio);
  assert.equal(result.valid, false);
  assert.equal(result.status, "insufficient_response");
  assert.ok(result.message?.includes("dưới 3 giây"));
});

test("Speaking: Valid audio recording metadata passes validation for Gemini API", () => {
  const validAudio = {
    S1: {
      hasRecorded: true,
      durationSeconds: 24,
      audioBase64: "data:audio/webm;base64," + "A".repeat(200),
    },
    part2_cue_card: {
      hasRecorded: true,
      durationSeconds: 85,
      audioBase64: "data:audio/webm;base64," + "B".repeat(500),
    },
  };

  const result = validateSpeakingInput(validAudio);
  assert.equal(result.valid, true);
  assert.equal(result.status, "success");
});

test("Speaking: Schema validates Gemini structured rejection for silence or non-English", () => {
  const rejectionFromAi = {
    hasAudibleSpeech: false,
    isEnglish: false,
    isRelevant: false,
    rejectionReason: "Audio contains only background noise and silence.",
    strengths: [],
    weaknesses: [],
    improvements: ["Ensure the microphone is working and speak clearly in English."],
  };

  const parsed = GeminiSpeakingOutputSchema.safeParse(rejectionFromAi);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.hasAudibleSpeech, false);
    assert.equal(parsed.data.overallBand, undefined);
  }
});

// ==========================================
// 3. OVERALL BAND CALCULATION TEST CASES
// ==========================================

test("Overall Band: Returns null if any skill has null or undefined band", () => {
  // Writing is null
  assert.equal(
    calculateOverallIeltsBand({
      listening: 6.5,
      reading: 6.0,
      writing: null,
      speaking: 6.5,
    }),
    null,
  );

  // Speaking is null
  assert.equal(
    calculateOverallIeltsBand({
      listening: 7.0,
      reading: 6.5,
      writing: 6.0,
      speaking: null,
    }),
    null,
  );

  // Both writing and speaking are null
  assert.equal(
    calculateOverallIeltsBand({
      listening: 7.0,
      reading: 7.0,
      writing: null,
      speaking: null,
    }),
    null,
  );

  // Reading is undefined
  assert.equal(
    calculateOverallIeltsBand({
      listening: 7.0,
      reading: undefined,
      writing: 6.5,
      speaking: 6.5,
    }),
    null,
  );

  // Listening is NaN
  assert.equal(
    calculateOverallIeltsBand({
      listening: Number.NaN,
      reading: 6.5,
      writing: 6.5,
      speaking: 6.5,
    }),
    null,
  );
});

test("Overall Band: Returns null if any skill has band < 1.0 (invalid score)", () => {
  assert.equal(
    calculateOverallIeltsBand({
      listening: 6.5,
      reading: 6.0,
      writing: 0,
      speaking: 6.5,
    }),
    null,
  );
});

test("Overall Band: Calculates correct IELTS half-band rounding when all 4 skills are valid", () => {
  // Case from spec: L: 6.5, R: 6.0, W: 6.0, S: 6.5 -> mean = 25 / 4 = 6.25 -> 6.5
  const result1 = calculateOverallIeltsBand({
    listening: 6.5,
    reading: 6.0,
    writing: 6.0,
    speaking: 6.5,
  });
  assert.equal(result1, 6.5);

  // 7.0, 7.5, 6.5, 6.5 -> 27.5 / 4 = 6.875 -> 7.0
  const result2 = calculateOverallIeltsBand({
    listening: 7.0,
    reading: 7.5,
    writing: 6.5,
    speaking: 6.5,
  });
  assert.equal(result2, 7.0);

  // 5.0, 5.5, 5.0, 5.0 -> 20.5 / 4 = 5.125 -> 5.0
  const result3 = calculateOverallIeltsBand({
    listening: 5.0,
    reading: 5.5,
    writing: 5.0,
    speaking: 5.0,
  });
  assert.equal(result3, 5.0);

  // 6.0, 6.0, 6.0, 5.0 -> 23 / 4 = 5.75 -> 6.0
  const result4 = calculateOverallIeltsBand({
    listening: 6.0,
    reading: 6.0,
    writing: 6.0,
    speaking: 5.0,
  });
  assert.equal(result4, 6.0);
});
