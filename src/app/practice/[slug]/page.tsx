import type { Metadata } from "next";
import { PracticeWorkspace } from "@/components/practice-workspace";
export const metadata: Metadata = { title: "Luyện Reading & Listening | AAA" };
export default async function ExercisePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PracticeWorkspace slug={slug} />;
}
