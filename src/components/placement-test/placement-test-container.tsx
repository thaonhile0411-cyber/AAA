"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import {
  scoreListening,
  scoreReading,
  countWords,
} from "@/lib/placement-scoring";
import {
  calculateOverallIeltsBand,
} from "@/lib/placement-ai-validation";
import { WRITING_TASKS } from "@/data/placement-test-data";
import type {
  WritingAssessmentResponse,
  SpeakingAssessmentResponse,
} from "@/lib/placement-ai-types";
import {
  clearPlacementTestStorage,
  isTestSubmitted,
  loadCompletedSkills,
  loadSavedAnswers,
  loadSavedResult,
  loadSavedSection,
  loadTestTimer,
  loadUnlockedSkills,
  saveActiveSection,
  saveAnswersToStorage,
  saveCompletedSkills,
  saveResultToStorage,
  saveTestTimer,
  saveUnlockedSkills,
  setTestSubmitted,
} from "@/lib/placement-storage";
import {
  getSectionProgress,
  getWritingMinWords,
  getWritingWordCount,
} from "@/lib/placement-progress";
import { savePlacementTestCloud } from "@/lib/supabase-client";
import type {
  PlacementTestAnswers,
  PlacementTestResult,
  SkillScoreResult,
  SpeakingRecordingInfo,
  TestSkill,
} from "@/types/placement-test";
import { ListeningSection } from "./listening-section";
import { ReadingSection } from "./reading-section";
import { ResultDashboard } from "./result-dashboard";
import { ReviewModal } from "./review-modal";
import { SectionStepper } from "./section-stepper";
import { SpeakingSection } from "./speaking-section";
import { TestIntroduction } from "./test-introduction";
import { WritingSection } from "./writing-section";

const DEFAULT_ANSWERS: PlacementTestAnswers = {
  listening: {},
  reading: {},
  writing: { task1: "", task2: "" },
  speakingRecordings: {},
};

const emptySubscribe = () => () => {};

export function PlacementTestContainer() {
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const [stage, setStage] = useState<"intro" | "testing" | "result">("intro");
  const [currentSkill, setCurrentSkill] = useState<TestSkill>("listening");
  const [completedSkills, setCompletedSkills] = useState<TestSkill[]>([]);
  const [unlockedSkills, setUnlockedSkills] = useState<TestSkill[]>(["listening"]);
  const [answers, setAnswers] = useState<PlacementTestAnswers>(DEFAULT_ANSWERS);
  const [result, setResult] = useState<PlacementTestResult | null>(null);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(3300); // 55 minutes
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);

  // AI Evaluation submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [evaluationStep, setEvaluationStep] = useState<string>("");
  const [attemptId, setAttemptId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aaa_placement_attempt_id");
      if (saved) return saved;
      const gen = `attempt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem("aaa_placement_attempt_id", gen);
      return gen;
    }
    return `attempt_${Date.now()}`;
  });

  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const submitRef = useRef<() => void>(() => {});
  const isSubmittingRef = useRef(false);
  const isSubmittedRef = useRef(false);
  const isRetryingRef = useRef(false);

  // Initialize state from localStorage asynchronously after mount
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;

      const submitted = isTestSubmitted();
      if (submitted) {
        isSubmittedRef.current = true;
      }

      const savedRes = loadSavedResult();
      if (savedRes) {
        setResult(savedRes);
        setStage("result");
        return;
      }

      const savedAns = loadSavedAnswers();
      setAnswers(savedAns);

      const savedCompleted = loadCompletedSkills();
      setCompletedSkills(savedCompleted);

      const savedUnlocked = loadUnlockedSkills();
      setUnlockedSkills(savedUnlocked);

      let savedSec = loadSavedSection();
      if (!savedUnlocked.includes(savedSec)) {
        savedSec = savedUnlocked[savedUnlocked.length - 1] || "listening";
      }
      setCurrentSkill(savedSec);

      const hasAnyAnswers =
        Object.keys(savedAns.listening).length > 0 ||
        Object.keys(savedAns.reading).length > 0 ||
        Boolean(savedAns.writing.task2) ||
        Object.keys(savedAns.speakingRecordings).length > 0 ||
        savedCompleted.length > 0;

      if (hasAnyAnswers) {
        setStage("testing");
      }

      // Restore timer
      const { deadlineMs } = loadTestTimer();
      if (deadlineMs) {
        const rem = Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
        setTimeRemainingSeconds(rem);
        if (rem <= 0 && (hasAnyAnswers || savedCompleted.length > 0) && !submitted) {
          setIsTimeUp(true);
          Promise.resolve().then(() => {
            submitRef.current();
          });
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Timer countdown while testing (calculates against saved deadline)
  useEffect(() => {
    if (stage === "testing" && !isSubmitting && !isTimeUp) {
      const checkTimer = () => {
        const { deadlineMs } = loadTestTimer();
        if (!deadlineMs) return;
        const rem = Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
        setTimeRemainingSeconds(rem);
        if (rem <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setIsTimeUp(true);
          submitRef.current();
        }
      };

      checkTimer();
      countdownRef.current = setInterval(checkTimer, 1000);
    } else {
      if (countdownRef.current) clearInterval(countdownRef.current);
    }

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [stage, isSubmitting, isTimeUp]);

  function formatTimer(sec: number) {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  // Navigation handlers
  function handleStartTest() {
    const now = Date.now();
    const deadline = now + 3300 * 1000;
    saveTestTimer(now, deadline);
    setTimeRemainingSeconds(3300);
    setIsTimeUp(false);
    isSubmittedRef.current = false;
    setTestSubmitted(false);

    setStage("testing");
    setCurrentSkill("listening");
    setUnlockedSkills(["listening"]);
    saveUnlockedSkills(["listening"]);
    saveActiveSection("listening");
    savePlacementTestCloud({
      current_skill: "listening",
      completed_skills: [],
      listening_answers: answers.listening,
      reading_answers: answers.reading,
      writing_response: answers.writing,
      speaking_recordings: answers.speakingRecordings,
      status: "in_progress",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Allows switching back to any unlocked skill or completed skill
  function handleSelectSkill(skill: TestSkill) {
    if (
      unlockedSkills.includes(skill) ||
      completedSkills.includes(skill) ||
      skill === currentSkill
    ) {
      setCurrentSkill(skill);
      saveActiveSection(skill);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleCompleteListening() {
    const nextCompleted: TestSkill[] = Array.from(
      new Set([...completedSkills, "listening" as TestSkill]),
    );
    const nextUnlocked: TestSkill[] = Array.from(
      new Set([...unlockedSkills, "listening" as TestSkill, "reading" as TestSkill]),
    );
    setCompletedSkills(nextCompleted);
    setUnlockedSkills(nextUnlocked);
    saveCompletedSkills(nextCompleted);
    saveUnlockedSkills(nextUnlocked);
    setCurrentSkill("reading");
    saveActiveSection("reading");

    savePlacementTestCloud({
      current_skill: "reading",
      completed_skills: nextCompleted,
      listening_answers: answers.listening,
      reading_answers: answers.reading,
      writing_response: answers.writing,
      speaking_recordings: answers.speakingRecordings,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCompleteReading() {
    const nextCompleted: TestSkill[] = Array.from(
      new Set([...completedSkills, "reading" as TestSkill]),
    );
    const nextUnlocked: TestSkill[] = Array.from(
      new Set([...unlockedSkills, "reading" as TestSkill, "writing" as TestSkill]),
    );
    setCompletedSkills(nextCompleted);
    setUnlockedSkills(nextUnlocked);
    saveCompletedSkills(nextCompleted);
    saveUnlockedSkills(nextUnlocked);
    setCurrentSkill("writing");
    saveActiveSection("writing");

    savePlacementTestCloud({
      current_skill: "writing",
      completed_skills: nextCompleted,
      listening_answers: answers.listening,
      reading_answers: answers.reading,
      writing_response: answers.writing,
      speaking_recordings: answers.speakingRecordings,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCompleteWriting() {
    const nextCompleted: TestSkill[] = Array.from(
      new Set([...completedSkills, "writing" as TestSkill]),
    );
    const nextUnlocked: TestSkill[] = Array.from(
      new Set([...unlockedSkills, "writing" as TestSkill, "speaking" as TestSkill]),
    );
    setCompletedSkills(nextCompleted);
    setUnlockedSkills(nextUnlocked);
    saveCompletedSkills(nextCompleted);
    saveUnlockedSkills(nextUnlocked);
    setCurrentSkill("speaking");
    saveActiveSection("speaking");

    savePlacementTestCloud({
      current_skill: "speaking",
      completed_skills: nextCompleted,
      listening_answers: answers.listening,
      reading_answers: answers.reading,
      writing_response: answers.writing,
      speaking_recordings: answers.speakingRecordings,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Answer handlers (Autosaves to storage and Supabase)
  function handleListeningChange(questionId: string, value: string) {
    setAnswers((prev) => {
      const next: PlacementTestAnswers = {
        ...prev,
        listening: { ...prev.listening, [questionId]: value },
      };
      saveAnswersToStorage(next);
      savePlacementTestCloud({
        current_skill: currentSkill,
        completed_skills: completedSkills,
        listening_answers: next.listening,
        reading_answers: next.reading,
        writing_response: next.writing,
        speaking_recordings: next.speakingRecordings,
      });
      return next;
    });
  }

  function handleReadingChange(questionId: string, value: string) {
    setAnswers((prev) => {
      const next: PlacementTestAnswers = {
        ...prev,
        reading: { ...prev.reading, [questionId]: value },
      };
      saveAnswersToStorage(next);
      savePlacementTestCloud({
        current_skill: currentSkill,
        completed_skills: completedSkills,
        listening_answers: next.listening,
        reading_answers: next.reading,
        writing_response: next.writing,
        speaking_recordings: next.speakingRecordings,
      });
      return next;
    });
  }

  function handleWritingChange(task: "task1" | "task2", content: string) {
    setAnswers((prev) => {
      const next: PlacementTestAnswers = {
        ...prev,
        writing: { ...prev.writing, [task]: content },
      };
      saveAnswersToStorage(next);
      savePlacementTestCloud({
        current_skill: currentSkill,
        completed_skills: completedSkills,
        listening_answers: next.listening,
        reading_answers: next.reading,
        writing_response: next.writing,
        speaking_recordings: next.speakingRecordings,
      });
      return next;
    });
  }

  function handleSpeakingRecording(
    questionKey: string,
    data: {
      blobUrl: string;
      duration: number;
      audioBase64?: string;
      mimeType?: string;
      storagePath?: string;
    },
  ) {
    setAnswers((prev) => {
      const next: PlacementTestAnswers = {
        ...prev,
        speakingRecordings: {
          ...prev.speakingRecordings,
          [questionKey]: {
            hasRecorded: true,
            durationSeconds: data.duration,
            timestamp: new Date().toISOString(),
            blobUrl: data.blobUrl,
            audioBase64: data.audioBase64,
            mimeType: data.mimeType,
            storagePath: data.storagePath,
          },
        },
      };
      saveAnswersToStorage(next);
      savePlacementTestCloud({
        current_skill: currentSkill,
        completed_skills: completedSkills,
        listening_answers: next.listening,
        reading_answers: next.reading,
        writing_response: next.writing,
        speaking_recordings: next.speakingRecordings,
      });
      return next;
    });
  }

  // Count answered questions per skill using central placement-progress logic
  const answeredCountMap: Record<
    TestSkill,
    { answered: number; total: number; label?: string }
  > = {
    listening: getSectionProgress("listening", answers),
    reading: getSectionProgress("reading", answers),
    writing: {
      answered: getWritingWordCount(answers),
      total: getWritingMinWords(),
      label: `${getWritingWordCount(answers)} từ`,
    },
    speaking: getSectionProgress("speaking", answers),
  };

  // Helper to call Writing AI evaluation API
  async function callEvaluateWritingApi(essayText: string): Promise<SkillScoreResult> {
    try {
      const task2Def = WRITING_TASKS.find((t) => t.taskNumber === 2);
      const task2Prompt = task2Def?.prompt || "";
      const task2QuestionId = task2Def?.id || "writing_task_2";

      const payload = {
        essay: essayText,
        prompt: task2Prompt,
        questionId: task2QuestionId,
        attemptId,
        submissionId: attemptId,
        idempotencyKey: `writing_${attemptId}_${task2QuestionId}`,
      };

      if (process.env.NODE_ENV !== "production") {
        console.log("[Writing Frontend Submission]", {
          attemptId,
          questionId: task2QuestionId,
          promptSnippet: task2Prompt.slice(0, 100) + "...",
          wordCount: countWords(essayText),
          submittedAt: new Date().toISOString(),
        });
      }

      const writingRes = await fetch("/api/placement-test/evaluate-writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(45000),
      });

      const writingJson = (await writingRes.json()) as WritingAssessmentResponse;

      if (writingJson.status === "success" && writingJson.overallBand !== null) {
        const providerName =
          writingJson.provider === "openai"
            ? "OpenAI"
            : writingJson.provider === "groq"
              ? "Groq"
              : "Google Gemini";

        return {
          skill: "writing",
          band: writingJson.overallBand,
          status: "success",
          provider: writingJson.provider,
          modelUsed: writingJson.modelUsed,
          details: {
            "Số từ Task 2": `${writingJson.wordCount || 0} từ`,
            "Đánh giá": `Đánh giá bởi ${providerName}`,
          },
          criteria: writingJson.criteria
            ? [
                {
                  name: "Task Response (TR)",
                  score: writingJson.criteria.taskResponse,
                  description: writingJson.criteriaFeedback?.taskResponse || "",
                },
                {
                  name: "Coherence and Cohesion (CC)",
                  score: writingJson.criteria.coherenceAndCohesion,
                  description: writingJson.criteriaFeedback?.coherenceAndCohesion || "",
                },
                {
                  name: "Lexical Resource (LR)",
                  score: writingJson.criteria.lexicalResource,
                  description: writingJson.criteriaFeedback?.lexicalResource || "",
                },
                {
                  name: "Grammatical Range and Accuracy (GRA)",
                  score: writingJson.criteria.grammaticalRangeAndAccuracy,
                  description: writingJson.criteriaFeedback?.grammaticalRangeAndAccuracy || "",
                },
              ]
            : undefined,
          feedback:
            writingJson.feedback?.summary ||
            "Đã hoàn thành đánh giá bài viết theo tiêu chuẩn IELTS.",
          evaluationDetails: {
            strengths: writingJson.feedback?.strengths,
            weaknesses: writingJson.feedback?.weaknesses,
            improvementSuggestions: writingJson.feedback?.improvements,
            evaluationSummary: writingJson.feedback?.summary,
            isAiEvaluated: true,
          },
        };
      }

      return {
        skill: "writing",
        band: null,
        status: writingJson.status || "api_error",
        statusMessage: writingJson.message || "Chưa thể đánh giá bài viết.",
        details: {
          "Số từ Task 2": `${writingJson.wordCount || 0} từ`,
          "Trạng thái": writingJson.message || "Chưa thể đánh giá",
        },
        feedback: writingJson.message || "Chưa thể đánh giá bài viết.",
      };
    } catch (err) {
      console.warn("Failed calling evaluate-writing:", err);
      const isTimeout = err instanceof Error && err.name === "TimeoutError";
      return {
        skill: "writing",
        band: null,
        status: isTimeout ? "timeout" : "api_error",
        statusMessage: isTimeout
          ? "Hết thời gian chờ phản hồi khi chấm Writing. Vui lòng thử lại."
          : "Lỗi kết nối khi đánh giá Writing.",
        feedback: isTimeout
          ? "Hết thời gian chờ phản hồi khi chấm Writing."
          : "Lỗi kết nối khi đánh giá Writing.",
      };
    }
  }

  // Helper to call Speaking AI evaluation API
  async function callEvaluateSpeakingApi(
    recordingsMap: Record<string, SpeakingRecordingInfo>,
  ): Promise<SkillScoreResult> {
    try {
      const speakingPayload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(recordingsMap)) {
        if (v?.hasRecorded) {
          speakingPayload[k] = {
            hasRecorded: true,
            durationSeconds: v.durationSeconds,
            audioBase64: v.audioBase64,
            mimeType: v.mimeType || "audio/webm",
          };
        }
      }

      const speakingProgress = getSectionProgress("speaking", answers);

      const speakingRes = await fetch("/api/placement-test/evaluate-speaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordings: speakingPayload,
          attemptId,
          submissionId: attemptId,
          idempotencyKey: `speaking_${attemptId}`,
        }),
        signal: AbortSignal.timeout(45000),
      });

      const speakingJson = (await speakingRes.json()) as SpeakingAssessmentResponse;

      if (speakingJson.status === "success" && speakingJson.overallBand !== null) {
        const providerName =
          speakingJson.provider === "openai" ? "OpenAI" : "Google Gemini";

        return {
          skill: "speaking",
          band: speakingJson.overallBand,
          status: "success",
          provider: speakingJson.provider,
          modelUsed: speakingJson.modelUsed,
          details: {
            "Số phần đã ghi âm": `${speakingProgress.answered} / ${speakingProgress.total} câu hỏi`,
            "Đánh giá": `Đánh giá bởi ${providerName}`,
          },
          criteria: speakingJson.criteria
            ? [
                {
                  name: "Fluency and Coherence (FC)",
                  score: speakingJson.criteria.fluencyAndCoherence,
                  description: speakingJson.criteriaFeedback?.fluencyAndCoherence || "",
                },
                {
                  name: "Lexical Resource (LR)",
                  score: speakingJson.criteria.lexicalResource,
                  description: speakingJson.criteriaFeedback?.lexicalResource || "",
                },
                {
                  name: "Grammatical Range and Accuracy (GRA)",
                  score: speakingJson.criteria.grammaticalRangeAndAccuracy,
                  description: speakingJson.criteriaFeedback?.grammaticalRangeAndAccuracy || "",
                },
                {
                  name: "Pronunciation (P)",
                  score: speakingJson.criteria.pronunciation,
                  description: speakingJson.criteriaFeedback?.pronunciation || "",
                },
              ]
            : undefined,
          feedback:
            speakingJson.feedback?.summary ||
            "Đã hoàn thành đánh giá bài nói theo tiêu chuẩn IELTS.",
          evaluationDetails: {
            strengths: speakingJson.feedback?.strengths,
            weaknesses: speakingJson.feedback?.weaknesses,
            improvementSuggestions: speakingJson.feedback?.improvements,
            evaluationSummary: speakingJson.feedback?.summary,
            isAiEvaluated: true,
          },
        };
      }

      return {
        skill: "speaking",
        band: null,
        status: speakingJson.status || "api_error",
        statusMessage: speakingJson.message || "Chưa thể đánh giá bài nói.",
        details: {
          "Trạng thái": speakingJson.message || "Chưa thể đánh giá",
        },
        feedback: speakingJson.message || "Chưa thể đánh giá bài nói.",
      };
    } catch (err) {
      console.warn("Failed calling evaluate-speaking:", err);
      const isTimeout = err instanceof Error && err.name === "TimeoutError";
      return {
        skill: "speaking",
        band: null,
        status: isTimeout ? "timeout" : "api_error",
        statusMessage: isTimeout
          ? "Hết thời gian chờ phản hồi khi chấm Speaking. Vui lòng thử lại."
          : "Lỗi kết nối khi đánh giá Speaking.",
        feedback: isTimeout
          ? "Hết thời gian chờ phản hồi khi chấm Speaking."
          : "Lỗi kết nối khi đánh giá Speaking.",
      };
    }
  }

  // Submit test with real Gemini AI Assessment
  async function handleSubmitTest() {
    if (isSubmittingRef.current || isSubmittedRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    saveAnswersToStorage(answers); // Safeguard: persist answers immediately
    let evaluationNotice: string | undefined;

    try {
      // 1. Score Listening & Reading with Answer Key
      setEvaluationStep("Đang đối chiếu Answer Key kỹ năng Listening và Reading...");
      const listeningResult = scoreListening(answers.listening);
      const readingResult = scoreReading(answers.reading);

      // 2. Score Writing with Gemini API
      setEvaluationStep("AI đang đánh giá bài luận Task 2 theo 4 tiêu chí IELTS qua Gemini...");
      const writingResult = await callEvaluateWritingApi(answers.writing.task2);
      if (writingResult.statusMessage && writingResult.band === null) {
        evaluationNotice = writingResult.statusMessage;
      }

      // 3. Score Speaking with Gemini API
      setEvaluationStep("AI đang phân tích âm thanh các câu trả lời Speaking qua Gemini...");
      const speakingResult = await callEvaluateSpeakingApi(answers.speakingRecordings);
      if (speakingResult.statusMessage && speakingResult.band === null && !evaluationNotice) {
        evaluationNotice = speakingResult.statusMessage;
      }

      // 4. Calculate Overall Band ONLY if all 4 skills have valid bands!
      const overallBand = calculateOverallIeltsBand({
        listening: listeningResult.band,
        reading: readingResult.band,
        writing: writingResult.band,
        speaking: speakingResult.band,
      });

      const scoredEntries: [TestSkill, number][] = [];
      if (listeningResult.band !== null) scoredEntries.push(["listening", listeningResult.band]);
      if (readingResult.band !== null) scoredEntries.push(["reading", readingResult.band]);
      if (writingResult.band !== null) scoredEntries.push(["writing", writingResult.band]);
      if (speakingResult.band !== null) scoredEntries.push(["speaking", speakingResult.band]);

      scoredEntries.sort((a, b) => b[1] - a[1]);
      const strongestSkill = scoredEntries.length > 0 ? scoredEntries[0][0] : null;
      const weakestSkill = scoredEntries.length > 0 ? scoredEntries[scoredEntries.length - 1][0] : null;

      const evaluated: PlacementTestResult = {
        overallBand,
        skills: {
          listening: listeningResult,
          reading: readingResult,
          writing: writingResult,
          speaking: speakingResult,
        },
        strongestSkill,
        weakestSkill,
        recommendations: {
          prioritySkill: weakestSkill || "writing",
          suggestedLevel:
            overallBand === null
              ? "Chưa xác định"
              : overallBand < 5.0
                ? "IELTS Foundation"
                : overallBand < 6.5
                  ? "IELTS Intermediate"
                  : "IELTS Advanced",
          tips: [],
        },
        submittedAt: new Date().toISOString(),
        evaluationStatus:
          writingResult.band !== null && speakingResult.band !== null
            ? "success"
            : writingResult.status || speakingResult.status || "partial",
        errorMessage: evaluationNotice,
      };

      const allCompleted: TestSkill[] = ["listening", "reading", "writing", "speaking"];
      setCompletedSkills(allCompleted);
      saveCompletedSkills(allCompleted);

      setResult(evaluated);
      saveResultToStorage(evaluated);
      setTestSubmitted(true);
      isSubmittedRef.current = true;

      const saveResult = await savePlacementTestCloud({
        current_skill: "speaking",
        completed_skills: allCompleted,
        listening_answers: answers.listening,
        reading_answers: answers.reading,
        writing_response: answers.writing,
        speaking_recordings: answers.speakingRecordings,
        assessment_results: evaluated,
        overall_band: evaluated.overallBand,
        status: "completed",
      });
      if (!saveResult.success) {
        console.warn("Could not save the completed placement result:", saveResult.error);
      }

      setStage("result");
      setIsReviewOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Evaluation submission failed:", err);
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  }

  // Retry ONLY failed AI skills (Preserves successful skills, never overwrites valid band)
  async function handleRetryFailedAiSkills() {
    if (!result || isRetryingRef.current) return;
    isRetryingRef.current = true;
    setIsRetrying(true);

    try {
      let updatedWriting = result.skills.writing;
      let updatedSpeaking = result.skills.speaking;
      let anySkillChanged = false;
      let latestNotice = result.errorMessage;

      // 1. Retry Writing ONLY if it currently has no valid band
      if (result.skills.writing.band === null) {
        const writingRes = await callEvaluateWritingApi(answers.writing.task2);
        updatedWriting = writingRes;
        anySkillChanged = true;
        if (writingRes.statusMessage && writingRes.band === null) {
          latestNotice = writingRes.statusMessage;
        }
      }

      // 2. Retry Speaking ONLY if it currently has no valid band
      if (result.skills.speaking.band === null) {
        const speakingRes = await callEvaluateSpeakingApi(answers.speakingRecordings);
        updatedSpeaking = speakingRes;
        anySkillChanged = true;
        if (speakingRes.statusMessage && speakingRes.band === null) {
          latestNotice = speakingRes.statusMessage;
        }
      }

      if (anySkillChanged) {
        // Recalculate Overall Band
        const overallBand = calculateOverallIeltsBand({
          listening: result.skills.listening.band,
          reading: result.skills.reading.band,
          writing: updatedWriting.band,
          speaking: updatedSpeaking.band,
        });

        const scoredEntries: [TestSkill, number][] = [];
        if (result.skills.listening.band !== null) scoredEntries.push(["listening", result.skills.listening.band]);
        if (result.skills.reading.band !== null) scoredEntries.push(["reading", result.skills.reading.band]);
        if (updatedWriting.band !== null) scoredEntries.push(["writing", updatedWriting.band]);
        if (updatedSpeaking.band !== null) scoredEntries.push(["speaking", updatedSpeaking.band]);

        scoredEntries.sort((a, b) => b[1] - a[1]);
        const strongestSkill = scoredEntries.length > 0 ? scoredEntries[0][0] : null;
        const weakestSkill = scoredEntries.length > 0 ? scoredEntries[scoredEntries.length - 1][0] : null;

        const updatedResult: PlacementTestResult = {
          ...result,
          overallBand,
          skills: {
            ...result.skills,
            writing: updatedWriting,
            speaking: updatedSpeaking,
          },
          strongestSkill,
          weakestSkill,
          recommendations: {
            prioritySkill: weakestSkill || "writing",
            suggestedLevel:
              overallBand === null
                ? "Chưa xác định"
                : overallBand < 5.0
                  ? "IELTS Foundation"
                  : overallBand < 6.5
                    ? "IELTS Intermediate"
                    : "IELTS Advanced",
            tips: [],
          },
          evaluationStatus:
            updatedWriting.band !== null && updatedSpeaking.band !== null
              ? "success"
              : updatedWriting.status || updatedSpeaking.status || "partial",
          errorMessage:
            updatedWriting.band !== null && updatedSpeaking.band !== null
              ? undefined
              : latestNotice,
        };

        setResult(updatedResult);
        saveResultToStorage(updatedResult);
        savePlacementTestCloud({
          current_skill: "speaking",
          completed_skills: ["listening", "reading", "writing", "speaking"],
          listening_answers: answers.listening,
          reading_answers: answers.reading,
          writing_response: answers.writing,
          speaking_recordings: answers.speakingRecordings,
          status: "completed",
        });
      }
    } catch (err) {
      console.warn("Failed retrying AI skills:", err);
    } finally {
      setIsRetrying(false);
      isRetryingRef.current = false;
    }
  }

  // Keep ref up to date
  useEffect(() => {
    submitRef.current = handleSubmitTest;
  });

  // Retake test
  function handleRetakeTest() {
    const newAttempt = `attempt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setAttemptId(newAttempt);
    if (typeof window !== "undefined") {
      localStorage.setItem("aaa_placement_attempt_id", newAttempt);
    }

    Object.values(answers.speakingRecordings).forEach((rec) => {
      if (rec?.blobUrl) {
        try {
          URL.revokeObjectURL(rec.blobUrl);
        } catch {}
      }
    });

    clearPlacementTestStorage();
    isSubmittedRef.current = false;
    setTestSubmitted(false);
    setIsTimeUp(false);
    setAnswers(DEFAULT_ANSWERS);
    setCompletedSkills([]);
    setUnlockedSkills(["listening"]);
    setResult(null);
    setTimeRemainingSeconds(3300);
    setStage("intro");
    setCurrentSkill("listening");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!isMounted) {
    return (
      <AppShell active="goals">
        <div className="loading-card" role="status">
          <span className="spinner" />
          Đang khởi tạo bài kiểm tra năng lực…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="goals">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span>US-103</span>
        <Icon name="chevron" size={12} />
        <Link href="/onboarding/goals">Đặt mục tiêu</Link>
        <Icon name="chevron" size={12} />
        <span>
          {stage === "intro"
            ? "Giới thiệu bài test"
            : stage === "testing"
              ? `Đang kiểm tra: ${currentSkill.toUpperCase()}`
              : "Kết quả đánh giá (Diagnostic Result)"}
        </span>
      </div>

      {/* Stepper (Steps 01, 02, 03) */}
      <ol className="stepper" aria-label="Các bước thiết lập lộ trình">
        <li>
          <Link
            href="/onboarding/goals"
            className="flex items-center gap-3 w-full"
            title="Quay lại chỉnh sửa mục tiêu"
          >
            <span className="step-number text-blue-600 bg-blue-50 border-blue-200 font-bold">
              ✓
            </span>
            <span>
              <strong>Đặt mục tiêu</strong>
              <small className="text-gray-500">Đã hoàn thành</small>
            </span>
          </Link>
        </li>
        <li className="current" aria-current="step">
          <span className="step-number">
            {stage === "result" ? "✓" : "02"}
          </span>
          <span>
            <strong>Xác định trình độ</strong>
            <small>
              {stage === "result"
                ? "Đã có kết quả chẩn đoán"
                : "Placement Test (4 kỹ năng)"}
            </small>
          </span>
        </li>
        <li>
          <span className="step-number">03</span>
          <span>
            <strong>Lộ trình của bạn</strong>
            <small>Sẵn sàng để tiến xa</small>
          </span>
        </li>
      </ol>

      {/* Views */}
      {stage === "intro" && (
        <TestIntroduction onStartTest={handleStartTest} />
      )}

      {stage === "testing" && (
        <div className="space-y-6">
          {/* Top Control Bar with Countdown Timer */}
          <div className="bg-white rounded-xl border border-[#e6eaf1] p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#175cdd] uppercase tracking-wider">
                IELTS Academic Diagnostic Test
              </span>
              <span className="text-xs text-[#8a95a7]">• 4 Kỹ năng (Tự động lưu)</span>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              {/* Single Unified Countdown Clock */}
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-bold text-xs md:text-sm ${
                  timeRemainingSeconds <= 300
                    ? "bg-rose-50 text-rose-600 border-rose-200 animate-pulse"
                    : "bg-[#f8fafc] text-[#1e293b] border-[#e2e8f0]"
                }`}
              >
                <Icon
                  name="clock"
                  size={15}
                  className={
                    timeRemainingSeconds <= 300
                      ? "text-rose-600"
                      : "text-[#175cdd]"
                  }
                />
                <span>{formatTimer(timeRemainingSeconds)}</span>
              </div>
            </div>
          </div>

          {/* 4-Skill Navigation Stepper (Clickable for unlocked & completed skills) */}
          <SectionStepper
            currentSkill={currentSkill}
            completedSkills={completedSkills}
            unlockedSkills={unlockedSkills}
            answeredCountMap={answeredCountMap}
            onSelectSkill={handleSelectSkill}
          />

          {/* Active Skill Content */}
          {currentSkill === "listening" && (
            <ListeningSection
              answers={answers.listening}
              onAnswerChange={handleListeningChange}
              onNextSection={handleCompleteListening}
              disabled={isSubmitting || isTimeUp}
            />
          )}

          {currentSkill === "reading" && (
            <ReadingSection
              answers={answers.reading}
              onAnswerChange={handleReadingChange}
              onNextSection={handleCompleteReading}
              disabled={isSubmitting || isTimeUp}
            />
          )}

          {currentSkill === "writing" && (
            <WritingSection
              writingAnswers={answers.writing}
              onWritingChange={handleWritingChange}
              onNextSection={handleCompleteWriting}
              disabled={isSubmitting || isTimeUp}
            />
          )}

          {currentSkill === "speaking" && (
            <SpeakingSection
              recordings={answers.speakingRecordings}
              onRecordingComplete={handleSpeakingRecording}
              onOpenReviewModal={() => setIsReviewOpen(true)}
              disabled={isSubmitting || isTimeUp}
            />
          )}

          {/* Auto-Submit Time Up Overlay */}
          {isTimeUp && isSubmitting && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                  <Icon name="clock" size={28} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Đã hết thời gian làm bài
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Hệ thống đang tự động nộp bài của bạn và kết nối AI chấm điểm. Vui lòng đợi trong giây lát...
                </p>
                <div className="flex items-center justify-center gap-3 text-sm text-[#175cdd] font-medium">
                  <span className="spinner" />
                  <span>{evaluationStep || "Đang xử lý bài làm..."}</span>
                </div>
              </div>
            </div>
          )}

          {/* Review Before Submit Modal */}
          <ReviewModal
            isOpen={isReviewOpen}
            onClose={() => setIsReviewOpen(false)}
            onConfirmSubmit={handleSubmitTest}
            answers={answers}
            onNavigateSkill={handleSelectSkill}
            isSubmitting={isSubmitting}
            evaluationStep={evaluationStep}
          />
        </div>
      )}

      {stage === "result" && result && (
        <ResultDashboard
          result={result}
          onRetakeTest={handleRetakeTest}
          onRetryAssessment={handleRetryFailedAiSkills}
          isRetrying={isRetrying}
        />
      )}
    </AppShell>
  );
}
