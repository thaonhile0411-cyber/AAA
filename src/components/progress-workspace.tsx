"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AssessmentComparison } from "@/lib/assessment-comparison";
import { PROFILE_SKILLS } from "@/lib/learner-skill-profile";
import { SkillRadarChart } from "@/components/skill-radar-chart";

const SKILL_LABELS = { listening: "Listening", reading: "Reading", writing: "Writing", speaking: "Speaking" } as const;

function changeLabel(change: number) {
  return change > 0 ? `+${change.toFixed(1)}` : change.toFixed(1);
}

export function ProgressWorkspace({ comparison }: { comparison: AssessmentComparison | null }) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateNextCycle() {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/personalized-roadmap/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replaceActive: true }),
      });
      const payload = (await response.json()) as { roadmapId?: string; error?: string };
      if (!response.ok || !payload.roadmapId) throw new Error(payload.error ?? "Không thể tạo chu kỳ mới.");
      router.push("/roadmap");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tạo chu kỳ mới.");
    } finally {
      setIsGenerating(false);
    }
  }

  if (!comparison) {
    return <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Theo dõi tiến bộ</p><h1 className="mt-2 text-2xl font-bold text-slate-900">Chưa có đủ hai lần đánh giá để so sánh</h1><p className="mt-3 text-sm leading-6 text-slate-600">Hoàn thành roadmap, thực hiện bài đánh giá lại và chờ đủ điểm của cả bốn kỹ năng.</p><Link href="/roadmap" className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800">Về lộ trình của tôi</Link></section>;
  }

  const { baseline, reassessment, history, skillChanges, overallChange } = comparison;
  return <div className="mx-auto max-w-6xl space-y-6"><section className="rounded-2xl bg-[#122d58] p-6 text-white shadow-lg"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9db5d8]">Progress comparison</p><h1 className="mt-2 text-2xl font-bold">Tiến bộ sau chu kỳ học</h1><p className="mt-2 text-sm text-[#dbe8ff]">So sánh trực tiếp kết quả Placement Test đầu vào với bài đánh giá lại gần nhất.</p><div className="mt-5 inline-flex rounded-xl bg-white/10 px-4 py-3"><span className="text-sm text-[#dbe8ff]">Overall Band thay đổi</span><strong className="ml-3 text-xl">{overallChange === null ? "—" : changeLabel(overallChange)}</strong></div></section>

    <SkillRadarChart series={history.map((attempt) => ({ profile: attempt.profile, label: `${attempt.assessmentKind === "placement" ? "Đầu vào" : "Đánh giá lại"} · ${new Date(attempt.createdAt).toLocaleDateString("vi-VN")}` }))} title={`So sánh ${history.length} lần test gần nhất`} subtitle="Tối đa ba bài hoàn tất gần nhất được chồng lên nhau; mỗi polygon có một màu và chỉ gồm bốn kỹ năng IELTS." />

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-900">Thay đổi theo từng kỹ năng</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{PROFILE_SKILLS.map((skill) => { const change = skillChanges[skill]; const before = baseline.profile.skills[skill]!; const after = reassessment.profile.skills[skill]!; return <div key={skill} className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-700">{SKILL_LABELS[skill]}</p><p className="mt-2 text-xs text-slate-500">{before.toFixed(1)} → {after.toFixed(1)}</p><p className={`mt-1 text-xl font-bold ${change > 0 ? "text-emerald-700" : change < 0 ? "text-rose-700" : "text-slate-700"}`}>{changeLabel(change)} band</p></div>; })}</div></section>

    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5"><h2 className="text-lg font-bold text-slate-900">Tạo chu kỳ tài liệu tiếp theo</h2><p className="mt-1 text-sm text-slate-700">Chu kỳ mới dùng kết quả đánh giá lại để phân bổ lại đề luyện. Lộ trình cũ sẽ được lưu trữ và không mất lịch sử hoàn thành.</p>{error && <p className="mt-3 text-sm font-semibold text-rose-700">{error}</p>}<button type="button" disabled={isGenerating} onClick={generateNextCycle} className="mt-4 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">{isGenerating ? "Đang tạo chu kỳ mới..." : "Tạo lộ trình mới theo kết quả này"}</button></section>
  </div>;
}
