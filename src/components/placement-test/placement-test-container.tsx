"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import {
  scoreListening,
  scoreReading,
} from "@/lib/placement-scoring";
import {
  calculateOverallIeltsBand,
} from "@/lib/placement-ai-validation";
import type {
  WritingAssessmentResponse,
  SpeakingAssessmentResponse,
} from "@/lib/placement-ai-types";
import {
  clearPlacementTestStorage,
  loadCompletedSkills,
  loadSavedAnswers,
  loadSavedResult,
  loadSavedSection,
  saveActiveSection,
  saveAnswersToStorage,
  saveCompletedSkills,
  saveResultToStorage,
} from "@/lib/placement-storage";
import { savePlacementTestCloud } from "@/lib/supabase-client";
import type {
  PlacementTestAnswers,
  PlacementTestResult,
  SkillScoreResult,
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

const SKILL_ORDER: TestSkill[] = ["listening", "reading", "writing", "speaking"];
const emptySubscribe = () => () => {};

export function PlacementTestContainer() {
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const [stage, setStage] = useState<"intro" | "testing" | "result">("intro");
  const [currentSkill, setCurrentSkill] = useState<TestSkill>("listening");
  const [completedSkills, setCompletedSkills] = useState<TestSkill[]>([]);
  const [answers, setAnswers] = useState<PlacementTestAnswers>(DEFAULT_ANSWERS);
  const [result, setResult] = useState<PlacementTestResult | null>(null);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(3300); // 55 minutes
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // AI Evaluation submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluationStep, setEvaluationStep] = useState<string>("");

  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const submitRef = useRef<() => void>(() => {});

  // Initialize state from localStorage asynchronously after mount
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
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

      let savedSec = loadSavedSection();
      const targetIdx = SKILL_ORDER.indexOf(savedSec);
      for (let i = 0; i < targetIdx; i++) {
        if (!savedCompleted.includes(SKILL_ORDER[i])) {
          savedSec = SKILL_ORDER[i];
          break;
        }
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
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Timer countdown while testing
  useEffect(() => {
    if (stage === "testing" && !isSubmitting) {
      countdownRef.current = setInterval(() => {
        setTimeRemainingSeconds((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            submitRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownRef.current) clearInterval(countdownRef.current);
    }

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [stage, isSubmitting]);

  function formatTimer(sec: number) {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  // Navigation handlers
  function handleStartTest() {
    setStage("testing");
    setCurrentSkill("listening");
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

  // Allows switching back to any completed skill or the current in-progress skill
  function handleSelectSkill(skill: TestSkill) {
    if (completedSkills.includes(skill) || skill === currentSkill) {
      setCurrentSkill(skill);
      saveActiveSection(skill);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleCompleteListening() {
    const nextCompleted: TestSkill[] = Array.from(
      new Set([...completedSkills, "listening" as TestSkill]),
    );
    setCompletedSkills(nextCompleted);
    saveCompletedSkills(nextCompleted);
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
    setCompletedSkills(nextCompleted);
    saveCompletedSkills(nextCompleted);
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
    setCompletedSkills(nextCompleted);
    saveCompletedSkills(nextCompleted);
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

  // Count answered questions per skill
  const listeningAnswered = Object.values(answers.listening).filter((v) =>
    Boolean(v?.trim()),
  ).length;
  const readingAnswered = Object.values(answers.reading).filter((v) =>
    Boolean(v?.trim()),
  ).length;
  const writingAnswered = Boolean(answers.writing.task2?.trim()) ? 1 : 0;
  const speakingAnswered = Object.values(answers.speakingRecordings).filter(
    (s) => s?.hasRecorded,
  ).length;

  const answeredCountMap: Record<
    TestSkill,
    { answered: number; total: number }
  > = {
    listening: { answered: listeningAnswered, total: 10 },
    reading: { answered: readingAnswered, total: 12 },
    writing: { answered: writingAnswered, total: 1 },
    speaking: { answered: speakingAnswered, total: 6 },
  };

  // Submit test with real Gemini AI Assessment
  async function handleSubmitTest() {
    setIsSubmitting(true);
    let evaluationNotice: string | undefined;

    try {
      // 1. Score Listening & Reading with Answer Key
      setEvaluationStep("Đang đối chiếu Answer Key kỹ năng Listening và Reading...");
      const listeningResult = scoreListening(answers.listening);
      const readingResult = scoreReading(answers.reading);

      // 2. Score Writing with Gemini API
      setEvaluationStep("AI đang đánh giá bài luận Task 2 theo 4 tiêu chí IELTS qua Gemini...");
      let writingResult: SkillScoreResult;

      try {
        const writingRes = await fetch("/api/placement-test/evaluate-writing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ essay: answers.writing.task2 }),
        });

        const writingJson = (await writingRes.json()) as WritingAssessmentResponse;

        if (writingJson.status === "success" && writingJson.overallBand !== null) {
          writingResult = {
            skill: "writing",
            band: writingJson.overallBand,
            status: "success",
            details: {
              "Số từ Task 2": `${writingJson.wordCount || 0} từ`,
              "Đánh giá": "Đánh giá bởi Gemini AI",
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
        } else {
          // Never assign a fake score!
          evaluationNotice = writingJson.message || "Chưa thể đánh giá bài viết qua AI.";
          writingResult = {
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
        }
      } catch (err) {
        console.warn("Failed calling evaluate-writing:", err);
        evaluationNotice = "Không thể kết nối đến máy chủ đánh giá Writing.";
        writingResult = {
          skill: "writing",
          band: null,
          status: "api_error",
          statusMessage: "Lỗi kết nối khi đánh giá Writing.",
          feedback: "Lỗi kết nối khi đánh giá Writing.",
        };
      }

      // 3. Score Speaking with Gemini API
      setEvaluationStep("AI đang phân tích âm thanh các câu trả lời Speaking qua Gemini...");
      let speakingResult: SkillScoreResult;

      try {
        const speakingPayload: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(answers.speakingRecordings)) {
          if (v?.hasRecorded) {
            speakingPayload[k] = {
              hasRecorded: true,
              durationSeconds: v.durationSeconds,
              audioBase64: v.audioBase64,
              mimeType: "audio/webm",
            };
          }
        }

        const speakingRes = await fetch("/api/placement-test/evaluate-speaking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recordings: speakingPayload }),
        });

        const speakingJson = (await speakingRes.json()) as SpeakingAssessmentResponse;

        if (speakingJson.status === "success" && speakingJson.overallBand !== null) {
          speakingResult = {
            skill: "speaking",
            band: speakingJson.overallBand,
            status: "success",
            details: {
              "Số phần đã ghi âm": "6 / 6 câu hỏi",
              "Đánh giá": "Đánh giá bởi Gemini AI",
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
        } else {
          // Never assign a fake score!
          if (!evaluationNotice) {
            evaluationNotice = speakingJson.message || "Chưa thể đánh giá bài nói qua AI.";
          }
          speakingResult = {
            skill: "speaking",
            band: null,
            status: speakingJson.status || "api_error",
            statusMessage: speakingJson.message || "Chưa thể đánh giá bài nói.",
            details: {
              "Trạng thái": speakingJson.message || "Chưa thể đánh giá",
            },
            feedback: speakingJson.message || "Chưa thể đánh giá bài nói.",
          };
        }
      } catch (err) {
        console.warn("Failed calling evaluate-speaking:", err);
        if (!evaluationNotice) {
          evaluationNotice = "Không thể kết nối đến máy chủ đánh giá Speaking.";
        }
        speakingResult = {
          skill: "speaking",
          band: null,
          status: "api_error",
          statusMessage: "Lỗi kết nối khi đánh giá Speaking.",
          feedback: "Lỗi kết nối khi đánh giá Speaking.",
        };
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
    }
  }

  // Keep ref up to date
  useEffect(() => {
    submitRef.current = handleSubmitTest;
  });

  // Retake test
  function handleRetakeTest() {
    Object.values(answers.speakingRecordings).forEach((rec) => {
      if (rec?.blobUrl) {
        try {
          URL.revokeObjectURL(rec.blobUrl);
        } catch {}
      }
    });

    clearPlacementTestStorage();
    setAnswers(DEFAULT_ANSWERS);
    setCompletedSkills([]);
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
          {/* Top Control Bar with Timer & Review Button */}
          <div className="bg-white rounded-xl border border-[#e6eaf1] p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#175cdd] uppercase tracking-wider">
                IELTS Academic Diagnostic Test
              </span>
              <span className="text-xs text-[#8a95a7]">• 4 Kỹ năng (Tự động lưu)</span>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              {/* Countdown Clock */}
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

              {/* Review & Submit Button */}
              <button
                type="button"
                onClick={() => setIsReviewOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-bold rounded-lg shadow-xs transition-all cursor-pointer"
              >
                <Icon name="check" size={15} />
                <span>Xem lại & Nộp bài</span>
              </button>
            </div>
          </div>

          {/* 4-Skill Navigation Stepper (Clickable for completed skills & active skill) */}
          <SectionStepper
            currentSkill={currentSkill}
            completedSkills={completedSkills}
            answeredCountMap={answeredCountMap}
            onSelectSkill={handleSelectSkill}
          />

          {/* Active Skill Content */}
          {currentSkill === "listening" && (
            <ListeningSection
              answers={answers.listening}
              onAnswerChange={handleListeningChange}
              onNextSection={handleCompleteListening}
            />
          )}

          {currentSkill === "reading" && (
            <ReadingSection
              answers={answers.reading}
              onAnswerChange={handleReadingChange}
              onNextSection={handleCompleteReading}
            />
          )}

          {currentSkill === "writing" && (
            <WritingSection
              writingAnswers={answers.writing}
              onWritingChange={handleWritingChange}
              onNextSection={handleCompleteWriting}
            />
          )}

          {currentSkill === "speaking" && (
            <SpeakingSection
              recordings={answers.speakingRecordings}
              onRecordingComplete={handleSpeakingRecording}
              onOpenReviewModal={() => setIsReviewOpen(true)}
            />
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
          onRetryAssessment={handleSubmitTest}
          isRetrying={isSubmitting}
        />
      )}
    </AppShell>
  );
}
