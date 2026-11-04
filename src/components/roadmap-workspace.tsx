"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ActiveRoadmap } from "@/lib/active-roadmap";
import { PROFILE_SKILLS } from "@/lib/learner-skill-profile";

const SKILL_LABELS = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
} as const;

export function RoadmapWorkspace({ initialRoadmap }: { initialRoadmap: ActiveRoadmap | null }) {
  const [roadmap, setRoadmap] = useState(initialRoadmap);
  const [savingId, setSavingId] = useState<string | null>(null);
  const activities = useMemo(() => roadmap?.milestones.flatMap((milestone) => milestone.activities) ?? [], [roadmap]);
  const completedCount = activities.filter((activity) => activity.completedAt !== null).length;
  const progress = activities.length === 0 ? 0 : Math.round((completedCount / activities.length) * 100);
  const totalMinutes = activities.reduce((total, activity) => total + (activity.estimatedMinutes ?? 0), 0);
  const isRoadmapComplete = activities.length > 0 && completedCount === activities.length;

  async function toggleActivity(activityId: string, completed: boolean) {
    setSavingId(activityId);
    try {
      const response = await fetch(`/api/v1/personalized-roadmap/activities/${activityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !completed }),
      });
      const payload = (await response.json()) as { completedAt?: string | null; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Không thể cập nhật tiến độ.");
      setRoadmap((current) => current ? {
        ...current,
        milestones: current.milestones.map((milestone) => ({
          ...milestone,
          activities: milestone.activities.map((activity) => activity.id === activityId ? { ...activity, completedAt: payload.completedAt ?? null } : activity),
        })),
      } : current);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không thể cập nhật tiến độ.");
    } finally {
      setSavingId(null);
    }
  }

  if (!roadmap) {
    return <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Lộ trình cá nhân hóa</p><h1 className="mt-2 text-2xl font-bold text-slate-900">Bạn chưa có lộ trình đang hoạt động</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">Hoàn thành Placement Test đủ bốn kỹ năng, rồi chọn “Tiếp tục tới lộ trình học” để nhận bộ đề phù hợp.</p><Link href="/onboarding/placement-test" className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800">Làm Placement Test</Link></section>;
  }

  return <div className="mx-auto max-w-5xl space-y-6">
    <section className="rounded-2xl bg-[#122d58] p-6 text-white shadow-lg"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9db5d8]">My learning roadmap</p><h1 className="mt-2 text-2xl font-bold">{roadmap.title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#dbe8ff]">{roadmap.summary}</p><div className="mt-5 grid gap-4 sm:grid-cols-3"><div><p className="text-xs text-[#9db5d8]">Tiến độ</p><p className="mt-1 text-2xl font-bold">{completedCount}/{activities.length}</p></div><div><p className="text-xs text-[#9db5d8]">Hoàn thành</p><p className="mt-1 text-2xl font-bold">{progress}%</p></div><div><p className="text-xs text-[#9db5d8]">Thời lượng dự kiến</p><p className="mt-1 text-2xl font-bold">{totalMinutes} phút</p></div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-[#72ddb8] transition-all" style={{ width: `${progress}%` }} /></div></section>

    {isRoadmapComplete && <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Chu kỳ học đã hoàn thành</p><h2 className="mt-1 text-lg font-bold text-emerald-950">Bạn đã sẵn sàng đánh giá lại</h2><p className="mt-1 text-sm text-emerald-900">Bài test mới sẽ được lưu thành một lần đánh giá riêng để so sánh với kết quả đầu vào.</p><Link href="/onboarding/placement-test?mode=reassessment" className="mt-4 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">Làm bài đánh giá lại</Link></section>}

    {roadmap.allocation && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-base font-bold text-slate-900">Tỷ lệ tài liệu được cá nhân hóa</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{PROFILE_SKILLS.map((skill) => { const allocation = roadmap.allocation![skill]; return <div key={skill} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-600">{SKILL_LABELS[skill]}</p><p className="mt-1 text-xl font-bold text-slate-900">{allocation.actualPercent}%</p><p className="text-[11px] text-slate-500">Mục tiêu {allocation.desiredPercent}% · {allocation.allocatedItems}/{allocation.availableItems} đề</p></div>; })}</div></section>}

    <section className="space-y-4"><div><h2 className="text-lg font-bold text-slate-900">Danh sách đề được giao</h2><p className="mt-1 text-sm text-slate-600">Làm bài trước, sau đó đánh dấu hoàn thành để cập nhật tiến độ.</p></div>{roadmap.milestones.map((milestone) => <article key={milestone.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><header className="border-b border-slate-100 bg-slate-50 px-5 py-4"><p className="text-xs font-bold uppercase tracking-wider text-blue-700">{SKILL_LABELS[milestone.skill]}</p><h3 className="mt-1 font-bold text-slate-900">{milestone.title}</h3><p className="mt-1 text-xs text-slate-600">{milestone.description}</p></header><ul className="divide-y divide-slate-100">{milestone.activities.map((activity) => { const isComplete = activity.completedAt !== null; return <li key={activity.id} className="flex flex-wrap items-center gap-3 px-5 py-4"><button type="button" disabled={savingId === activity.id} onClick={() => toggleActivity(activity.id, isComplete)} aria-label={isComplete ? `Đánh dấu ${activity.title} chưa hoàn thành` : `Đánh dấu ${activity.title} hoàn thành`} className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${isComplete ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 text-transparent"}`}>✓</button><div className="min-w-48 flex-1"><p className={`text-sm font-semibold ${isComplete ? "text-slate-400 line-through" : "text-slate-900"}`}>{activity.title}</p>{activity.description && <p className="mt-0.5 text-xs text-slate-500">{activity.description}</p>}</div><span className="text-xs text-slate-500">{activity.estimatedMinutes ?? "—"} phút</span>{activity.resourceSlug ? <Link href={`/practice/${activity.resourceSlug}`} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">Mở đề</Link> : null}</li>; })}</ul></article>)}</section>
  </div>;
}
