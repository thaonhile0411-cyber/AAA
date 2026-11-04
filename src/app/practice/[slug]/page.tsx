import type { Metadata } from "next";
import { Suspense } from "react";
import { OriginalPracticeTestPage } from "@/components/original-practice-test";
export const metadata: Metadata = { title: "Bài luyện IELTS | AAA" };
export default function ExercisePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<div className="loading-card">Đang mở bài luyện…</div>}>
      <ResolvedExercise params={params} />
    </Suspense>
  );
}

async function ResolvedExercise({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <OriginalPracticeTestPage key={slug} slug={slug} />;
}
