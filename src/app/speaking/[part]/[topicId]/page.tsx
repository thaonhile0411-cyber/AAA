import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isSpeakingPart } from "@/features/speaking/bank";
import { speakingTopics } from "@/features/speaking/topics";
import { speakingParts } from "@/features/speaking/types";
import SpeakingPractice from "@/features/speaking/SpeakingPractice";

type Props = { params: Promise<{ part: string; topicId: string }> };
export function generateStaticParams() {
  return speakingParts.flatMap((part) =>
    speakingTopics.map((topic) => ({ part, topicId: topic.id })),
  );
}
export default function TopicPage({ params }: Props) {
  return (
    <Suspense fallback={<p role="status">Đang tải câu hỏi Speaking…</p>}>
      <TopicContent params={params} />
    </Suspense>
  );
}
async function TopicContent({ params }: Props) {
  const { part, topicId } = await params;
  const topic = speakingTopics.find((item) => item.id === topicId);
  if (!isSpeakingPart(part) || !topic) notFound();
  return (
    <SpeakingPractice key={`${part}:${topic.id}`} part={part} topic={topic} />
  );
}
