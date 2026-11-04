import type { Metadata } from "next";
import { Suspense } from "react";
import { OriginalPracticeTestPage } from "@/components/original-practice-test";
import { PracticeWorkspace } from "@/components/practice-workspace";
import { findOriginalPracticeTest } from "@/data/original-practice-tests";
export const metadata: Metadata = { title: "Bài luyện IELTS | AAA" };

export default function ExercisePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<p role="status">Đang tải bài luyện…</p>}>
      <ExerciseContent params={params} />
    </Suspense>
  );
}

async function ExerciseContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return findOriginalPracticeTest(slug) ? (
    <OriginalPracticeTestPage key={slug} slug={slug} />
  ) : (
    <PracticeWorkspace key={slug} slug={slug} />
  );
}
