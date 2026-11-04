"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { SkillRadarChart } from "@/components/skill-radar-chart";
import { loadGoals } from "@/features/auth/onboarding";
import { formatDate, type UserProfile } from "@/lib/goals";
import { profileFromPlacementAssessment } from "@/lib/learner-skill-profile";
import type { PlacementTestResult, TestSkill } from "@/types/placement-test";

type ResultDashboardProps = {
  result: PlacementTestResult;
  isReassessment?: boolean;
  onRetakeTest: () => void;
  onRetryAssessment?: () => void;
  isRetrying?: boolean;
};

const SKILL_NAMES: Record<TestSkill, string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
};

export function ResultDashboard({
  result,
  isReassessment = false,
  onRetakeTest,
  onRetryAssessment,
  isRetrying = false,
}: ResultDashboardProps) {
  const router = useRouter();
  const [profileState, setProfileState] = useState<{
    profile: UserProfile | null;
    loaded: boolean;
    today: string;
  }>({ profile: null, loaded: false, today: "" });
  const [selectedSkillModal, setSelectedSkillModal] = useState<"writing" | "speaking" | null>(null);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(async () => {
      if (cancelled) return;
      try {
        const { profile, today } = await loadGoals();
        if (!cancelled) setProfileState({ profile, loaded: true, today });
      } catch (e) {
        console.warn("Could not load profile in result dashboard", e);
        if (!cancelled)
          setProfileState({ profile: null, loaded: true, today: "" });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const userProfile = profileState.profile;
  const profileLoaded = profileState.loaded;
  const today = profileState.today;

  const { overallBand, skills, errorMessage } = result;
  const learnerSkillProfile = profileFromPlacementAssessment(result);

  // Has any AI skill failed?
  const hasUnassessedAiSkill =
    skills.writing.band === null || skills.speaking.band === null;

  // Days until exam calculation
  const daysUntilExam =
    userProfile?.examDate && userProfile.examDate >= today
      ? Math.round(
          (Date.parse(`${userProfile.examDate}T00:00:00Z`) -
            Date.parse(`${today}T00:00:00Z`)) /
            86400000,
        )
      : null;

  // Band gap calculation (Target Band - Current Overall Band)
  const targetBand = userProfile?.targetBand;
  const bandGap =
    overallBand !== null && targetBand !== undefined && targetBand !== null
      ? Math.round((targetBand - overallBand) * 10) / 10
      : null;

  function getBandDescription(band: number | null): string {
    if (band === null) return "Chưa thể đánh giá Overall Band do thiếu điểm kỹ năng hợp lệ";
    if (band >= 8.5) return "Expert User (Thông thạo xuất sắc)";
    if (band >= 7.5) return "Very Good User (Rất tốt, tự nhiên)";
    if (band >= 6.5) return "Competent User (Khá tốt, chủ động)";
    if (band >= 5.5) return "Modest User (Trung bình khá, cơ bản)";
    if (band >= 4.5) return "Limited User (Cần củng cố nền tảng)";
    return "Foundation Level (Khởi động làm quen)";
  }

  const selectedSkillData = selectedSkillModal ? skills[selectedSkillModal] : null;

  async function handleContinueToRoadmap() {
    if (isReassessment) {
      router.push("/progress");
      return;
    }
    if (overallBand === null) {
      alert("Hoàn thành đánh giá đủ 4 kỹ năng trước khi tạo lộ trình.");
      return;
    }
    setIsGeneratingRoadmap(true);
    try {
      const response = await fetch("/api/v1/personalized-roadmap/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const payload = (await response.json()) as {
        roadmapId?: string;
        reused?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.roadmapId) {
        throw new Error(payload.error ?? "Chưa thể tạo lộ trình. Vui lòng thử lại.");
      }
      alert(
        payload.reused
          ? "Bạn đã có một lộ trình đang hoạt động."
          : "Đã tạo lộ trình cá nhân hóa và lưu danh sách tài liệu của bạn.",
      );
      router.push("/roadmap");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Chưa thể tạo lộ trình. Vui lòng thử lại.");
    } finally {
      setIsGeneratingRoadmap(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Top Banner: Success or Evaluation Notice */}
      <div className="bg-[#f0faf5] border border-[#bce4d6] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#147054] text-white flex items-center justify-center flex-shrink-0">
            <Icon name="check" size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#147054]">
              {overallBand !== null
                ? "Chúc mừng bạn đã hoàn thành bài kiểm tra IELTS Placement Test!"
                : "Bài làm Placement Test của bạn đã được ghi nhận."}
            </h2>
            <p className="text-xs text-[#235848] mt-0.5">
              {overallBand !== null
                ? "Kết quả đánh giá trình độ khởi điểm từ 4 kỹ năng đã được tổng hợp thành công."
                : "Listening và Reading đã được chấm. Writing và Speaking cần kiểm tra trạng thái đánh giá AI bên dưới."}
            </p>
          </div>
        </div>

        <div className="text-[11px] text-[#2c725c] bg-white/80 border border-[#bce4d6] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5">
          <Icon name="shield" size={14} />
          <span>IELTS Placement Diagnostic Test</span>
        </div>
      </div>

      {/* Notice if AI key was missing or evaluation had issues */}
      {hasUnassessedAiSkill && (
        <div className="p-4 bg-[#fff8eb] border border-[#f5dfb8] rounded-xl text-xs text-[#925507] space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <Icon name="alert" size={16} />
            <span>Thông báo trạng thái đánh giá AI (Version 3.1):</span>
          </div>
          <p className="leading-relaxed">
            {errorMessage ||
              "Hệ thống không sử dụng điểm giả lập. Một số kỹ năng chưa có điểm số AI hợp lệ do thiếu cấu hình GEMINI_API_KEY hoặc nội dung không hợp lệ. Vui lòng xem chi tiết từng kỹ năng bên dưới."}
          </p>

          {onRetryAssessment && (
            <div className="pt-1">
              <button
                type="button"
                disabled={isRetrying}
                onClick={onRetryAssessment}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#175cdd] hover:bg-[#104dc1] text-white font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50"
              >
                <Icon name="refresh" size={13} className={isRetrying ? "animate-spin" : ""} />
                <span>{isRetrying ? "Đang chấm lại..." : "Thử chấm lại với AI"}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 1. OVERALL BAND & 4 SIMPLE SKILL CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Overall Band Card */}
        <div className="lg:col-span-4 bg-[#122d58] text-white rounded-2xl p-6 shadow-lg border border-[#183966] flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#9db5d8] flex items-center gap-1.5">
              <Icon name="sparkle" size={14} />
              ESTIMATED OVERALL BAND
            </span>

            {/* Big Band Number or Unassessed Indicator */}
            <div className="my-6 text-center">
              {overallBand !== null ? (
                <>
                  <span className="text-6xl sm:text-7xl font-extrabold tracking-tight text-white block">
                    {overallBand.toFixed(1)}
                  </span>
                  <span className="text-xs font-semibold text-[#8ba8d4] mt-1 block">
                    thang điểm 9.0 IELTS
                  </span>
                </>
              ) : (
                <>
                  <span className="text-5xl font-extrabold tracking-tight text-[#cbd5e1] block">
                    —
                  </span>
                  <span className="text-xs font-semibold text-[#94a3b8] mt-2 block">
                    Chưa đủ 4 kỹ năng hợp lệ
                  </span>
                </>
              )}
            </div>

            <div className="text-center bg-white/10 rounded-xl p-3 backdrop-blur-xs">
              <span className="text-xs font-semibold text-[#e2ecfa] block">
                {getBandDescription(overallBand)}
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-[#8aa5ce] space-y-1 relative z-10">
            <p>• Điểm Overall tính từ trung bình cộng 4 kỹ năng làm tròn 0.5</p>
            <p>• Không gán điểm giả hoặc dùng heuristic thay thế AI</p>
          </div>
        </div>

        {/* 4 Simple Skill Cards */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(["listening", "reading", "writing", "speaking"] as TestSkill[]).map(
            (skill) => {
              const s = skills[skill];
              const isAiSkill = skill === "writing" || skill === "speaking";
              const isSuccess = s.band !== null;

              return (
                <div
                  key={skill}
                  onClick={() => {
                    if (isAiSkill && isSuccess) {
                      setSelectedSkillModal(skill);
                    }
                  }}
                  className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all ${
                    !isSuccess
                      ? "border-[#fde68a] bg-[#fffdfa]"
                      : isAiSkill
                        ? "border-[#e6eaf1] cursor-pointer hover:border-[#175cdd] hover:shadow-sm"
                        : "border-[#e6eaf1]"
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-[#edf3ff] text-[#175cdd] flex items-center justify-center text-xs font-bold">
                          {skill.charAt(0).toUpperCase()}
                        </span>
                        <h4 className="font-bold text-sm text-[#11213f]">
                          {SKILL_NAMES[skill]}
                        </h4>
                      </div>

                      {isAiSkill && (
                        isSuccess ? (
                          <span className="text-[10px] font-semibold text-[#175cdd] bg-[#eff5ff] border border-[#d6e4fd] px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Icon name="sparkle" size={10} />
                            AI Evaluated
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-[#b45309] bg-[#fef3c7] border border-[#fde68a] px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Icon name="alert" size={10} />
                            Chưa có điểm AI
                          </span>
                        )
                      )}
                    </div>

                    {/* Band Score or Unassessed */}
                    <div className="flex items-baseline gap-2 my-2">
                      {isSuccess ? (
                        <>
                          <span className="text-3xl font-extrabold text-[#11213f]">
                            {s.band!.toFixed(1)}
                          </span>
                          <span className="text-xs text-[#8c9bb3]">/ 9.0</span>
                        </>
                      ) : (
                        <span className="text-sm font-bold text-[#b45309] bg-[#fffbeb] px-3 py-1 rounded-lg border border-[#fde68a]">
                          Chưa thể đánh giá
                        </span>
                      )}
                    </div>

                    {/* Subtitle / Stat */}
                    <p className="text-xs text-[#64748b] leading-relaxed">
                      {skill === "listening" &&
                        (s.rawScore !== undefined
                          ? `${s.rawScore}/10 câu trả lời đúng (Answer Key)`
                          : "10 câu hỏi")}
                      {skill === "reading" &&
                        (s.rawScore !== undefined
                          ? `${s.rawScore}/12 câu trả lời đúng (Answer Key)`
                          : "12 câu hỏi")}
                      {skill === "writing" &&
                        (isSuccess
                          ? "Task 2 Academic Essay (Click để xem 4 tiêu chí TR, CC, LR, GRA)"
                          : s.statusMessage || s.feedback)}
                      {skill === "speaking" &&
                        (isSuccess
                          ? "Speaking 3 Parts (Click để xem 4 tiêu chí FC, LR, GRA, P)"
                          : s.statusMessage || s.feedback)}
                    </p>
                  </div>

                  {isAiSkill && isSuccess && (
                    <div className="mt-3 pt-2.5 border-t border-[#f1f5f9] text-[11px] font-semibold text-[#175cdd] flex items-center justify-between">
                      <span>Xem chi tiết 4 tiêu chí chấm điểm</span>
                      <Icon name="arrow" size={12} />
                    </div>
                  )}
                </div>
              );
            },
          )}
        </div>
      </div>

      {learnerSkillProfile && <SkillRadarChart profile={learnerSkillProfile} />}

      {/* 2. COMPARE WITH MY GOAL (FROM STEP 01) */}
      <div className="bg-white border border-[#e6eaf1] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#edf3ff] text-[#175cdd] flex items-center justify-center">
              <Icon name="target" size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#11213f]">
                So sánh mục tiêu học tập (Đối chiếu với Bước 01)
              </h3>
              <p className="text-xs text-[#64748b]">
                Dữ liệu được trích xuất từ khảo sát mục tiêu đã lưu của bạn
              </p>
            </div>
          </div>

          {userProfile && (
            <Link
              href="/settings/goals"
              className="text-xs font-semibold text-[#175cdd] hover:underline"
            >
              Chỉnh sửa mục tiêu
            </Link>
          )}
        </div>

        {profileLoaded && !userProfile ? (
          <div className="p-4 bg-[#fff9ed] border border-[#f1deb0] rounded-xl text-xs text-[#946513] space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <Icon name="info" size={16} />
              <span>Chưa tìm thấy dữ liệu mục tiêu từ Bước 01</span>
            </div>
            <p className="leading-relaxed text-[#7a5410]">
              Bạn chưa hoàn thành bước đặt mục tiêu trước khi làm bài test. Vui lòng quay lại Bước 01 để chọn band mục tiêu và ngày thi để nhận phân tích so sánh chi tiết.
            </p>
            <div>
              <Link
                href="/onboarding/goals"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#175cdd] text-white rounded-lg font-bold text-xs hover:bg-[#104dc1] transition-colors"
              >
                <span>Đến Bước 01: Đặt mục tiêu</span>
                <Icon name="arrow" size={14} />
              </Link>
            </div>
          </div>
        ) : userProfile ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
            <div className="bg-[#f8faff] p-3.5 rounded-xl border border-[#e5edfa]">
              <span className="text-[11px] font-semibold text-[#64748b] block mb-1">
                Điểm test ước lượng
              </span>
              <span className="text-2xl font-bold text-[#175cdd]">
                {overallBand !== null ? overallBand.toFixed(1) : "—"}
              </span>
              <span className="text-[11px] text-[#8c9bb3] block mt-0.5">
                Current Estimated Band
              </span>
            </div>

            <div className="bg-[#f8faff] p-3.5 rounded-xl border border-[#e5edfa]">
              <span className="text-[11px] font-semibold text-[#64748b] block mb-1">
                Mục tiêu đã đặt (Bước 01)
              </span>
              <span className="text-2xl font-bold text-[#11213f]">
                {userProfile.targetBand.toFixed(1)}
              </span>
              <span className="text-[11px] text-[#8c9bb3] block mt-0.5">
                Target Band
              </span>
            </div>

            <div className="bg-[#f8faff] p-3.5 rounded-xl border border-[#e5edfa]">
              <span className="text-[11px] font-semibold text-[#64748b] block mb-1">
                Khoảng cách cần cải thiện
              </span>
              <span
                className={`text-2xl font-bold ${
                  bandGap !== null && bandGap > 0
                    ? "text-[#d97706]"
                    : "text-[#147054]"
                }`}
              >
                {bandGap !== null
                  ? bandGap > 0
                    ? `+${bandGap.toFixed(1)} Band`
                    : "Đã đạt mục tiêu"
                  : "—"}
              </span>
              <span className="text-[11px] text-[#8c9bb3] block mt-0.5">
                Band Gap
              </span>
            </div>

            <div className="bg-[#f8faff] p-3.5 rounded-xl border border-[#e5edfa]">
              <span className="text-[11px] font-semibold text-[#64748b] block mb-1">
                Thời gian còn lại
              </span>
              <span className="text-2xl font-bold text-[#11213f]">
                {daysUntilExam !== null ? `${daysUntilExam} ngày` : "—"}
              </span>
              <span className="text-[11px] text-[#8c9bb3] block mt-0.5">
                Thi: {formatDate(userProfile.examDate)}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* 3. TWO ACTION BUTTONS */}
      <div className="bg-white border border-[#e6eaf1] rounded-2xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Retake Test */}
        <button
          type="button"
          onClick={onRetakeTest}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#52637a] bg-white border border-[#d8e0ec] rounded-xl hover:bg-[#f8fafc] transition-all cursor-pointer"
        >
          <Icon name="refresh" size={15} />
          <span>Làm lại bài kiểm tra (Retake Test)</span>
        </button>

        {/* Continue to Learning Path */}
        <div className="flex items-center gap-3">
          <Link
            href="/onboarding/goals"
            className="px-4 py-2.5 text-xs font-semibold text-[#175cdd] bg-[#edf3ff] rounded-xl hover:bg-[#dfeafc] transition-colors"
          >
            ← Về Bước 01 (Mục tiêu)
          </Link>

          <button
            type="button"
            onClick={() => {
              if (overallBand === null) {
                alert("Hoàn thành đánh giá đủ 4 kỹ năng trước khi tạo lộ trình.");
                return;
              }
              void handleContinueToRoadmap();
            }}
            disabled={isGeneratingRoadmap}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#175cdd] hover:bg-[#104dc1] rounded-xl shadow-md transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>{isReassessment ? "Xem tiến bộ" : isGeneratingRoadmap ? "Đang tạo lộ trình..." : "Tiếp tục tới lộ trình học"}</span>
            <Icon name="arrow" size={15} />
          </button>
        </div>
      </div>

      {/* Modal: Detailed Criteria Breakdown for Writing / Speaking */}
      {selectedSkillModal && selectedSkillData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#e2e8f0] space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[#edf3ff] text-[#175cdd] flex items-center justify-center text-xs font-bold">
                  {selectedSkillModal.charAt(0).toUpperCase()}
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#11213f] m-0">
                    Chi tiết 4 tiêu chí chấm điểm IELTS {SKILL_NAMES[selectedSkillModal]}
                  </h3>
                  <span className="text-xs text-[#64748b]">
                    Overall Skill Band: <strong>{selectedSkillData.band !== null ? selectedSkillData.band.toFixed(1) : "—"}</strong>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSkillModal(null)}
                className="p-1.5 text-[#94a3b8] hover:text-[#334155] rounded-lg transition-colors cursor-pointer"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            {/* Criteria List */}
            {selectedSkillData.criteria && selectedSkillData.criteria.length > 0 ? (
              <div className="space-y-3">
                {selectedSkillData.criteria.map((c) => (
                  <div
                    key={c.name}
                    className="p-3.5 rounded-xl border border-[#edf0f5] bg-[#fafbfd] space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#11213f]">
                        {c.name}
                      </span>
                      <span className="text-xs font-extrabold text-[#175cdd] bg-[#edf3ff] px-2 py-0.5 rounded-md">
                        Band {c.score.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-xs text-[#475569] leading-relaxed m-0">
                      {c.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#64748b]">
                {selectedSkillData.feedback}
              </p>
            )}

            {/* Strengths & Weaknesses if available */}
            {selectedSkillData.evaluationDetails?.strengths &&
              selectedSkillData.evaluationDetails.strengths.length > 0 && (
                <div className="p-3.5 rounded-xl border border-[#bce4d6] bg-[#f0faf5] space-y-1.5">
                  <span className="text-xs font-bold text-[#147054] block">
                    Điểm mạnh:
                  </span>
                  <ul className="text-xs text-[#235848] space-y-1 pl-4 list-disc">
                    {selectedSkillData.evaluationDetails.strengths.map(
                      (str, i) => (
                        <li key={i}>{str}</li>
                      ),
                    )}
                  </ul>
                </div>
              )}

            {selectedSkillData.evaluationDetails?.weaknesses &&
              selectedSkillData.evaluationDetails.weaknesses.length > 0 && (
                <div className="p-3.5 rounded-xl border border-[#fed7aa] bg-[#fffaf5] space-y-1.5">
                  <span className="text-xs font-bold text-[#c2410c] block">
                    Điểm cần lưu ý:
                  </span>
                  <ul className="text-xs text-[#9a3412] space-y-1 pl-4 list-disc">
                    {selectedSkillData.evaluationDetails.weaknesses.map(
                      (wk, i) => (
                        <li key={i}>{wk}</li>
                      ),
                    )}
                  </ul>
                </div>
              )}

            {/* Improvement suggestions if available */}
            {selectedSkillData.evaluationDetails?.improvementSuggestions &&
              selectedSkillData.evaluationDetails.improvementSuggestions.length > 0 && (
                <div className="p-3.5 rounded-xl border border-[#bed7ff] bg-[#eff5ff] space-y-1.5">
                  <span className="text-xs font-bold text-[#175cdd] block">
                    Gợi ý cải thiện:
                  </span>
                  <ul className="text-xs text-[#1e40af] space-y-1 pl-4 list-disc">
                    {selectedSkillData.evaluationDetails.improvementSuggestions.map(
                      (tip, i) => (
                        <li key={i}>{tip}</li>
                      ),
                    )}
                  </ul>
                </div>
              )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSkillModal(null)}
                className="px-5 py-2 bg-[#175cdd] text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
