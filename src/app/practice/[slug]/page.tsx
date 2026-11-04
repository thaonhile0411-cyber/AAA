import type { Metadata } from "next";
import { OriginalPracticeTestPage } from "@/components/original-practice-test";
export const metadata: Metadata = { title: "Bài luyện IELTS | AAA" };
export default async function ExercisePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <OriginalPracticeTestPage key={slug} slug={slug} />;
}
