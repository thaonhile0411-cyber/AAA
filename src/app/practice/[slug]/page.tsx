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
  return <OriginalPracticeTestPage key={slug} slug={slug} />;
}
