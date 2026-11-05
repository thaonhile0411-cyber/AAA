import type { Metadata } from "next";
import { Suspense } from "react";
import { OriginalPracticeTestPage } from "@/components/original-practice-test";
import { PracticeWorkspace } from "@/components/practice-workspace";
import { findOriginalPracticeTest } from "@/data/original-practice-tests";
import { StudyTracker } from "@/features/dashboard/StudyTracker";
import { authenticatedClient } from "@/lib/supabase/server";
export const metadata: Metadata = { title: "Bài luyện IELTS | AAA" };

export default function ExercisePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ task?: string }>;
}) {
  return (
    <Suspense fallback={<p role="status">Đang tải bài luyện…</p>}>
      <ExerciseContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ExerciseContent({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ task?: string }>;
}) {
  const { slug } = await params;
  const { task } = await searchParams;
  const { userId } = await authenticatedClient();
  const taskId = task && /^[0-9a-f-]{36}$/i.test(task) ? task : null;
  return <><StudyTracker key={`${slug}:${taskId}`} resourceSlug={slug} taskId={taskId} />{findOriginalPracticeTest(slug) ? (
    <OriginalPracticeTestPage key={`${userId}:${slug}`} slug={slug} userId={userId} />
  ) : (
    <PracticeWorkspace key={slug} slug={slug} />
  )}</>;
}
