import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isSpeakingPart, questionsForPart } from "@/features/speaking/bank";
import { PartNavigation } from "@/features/speaking/PartNavigation";
import { QuestionAudioProvider } from "@/features/speaking/QuestionAudio";
import { TopicMaterials } from "@/features/speaking/TopicMaterials";
import { speakingTopics } from "@/features/speaking/topics";
import { speakingParts } from "@/features/speaking/types";
import { shadowModels } from "@/features/shadowing/data";
import ShadowingPractice from "@/features/shadowing/ShadowingPractice";
import { shadowingUser } from "@/features/shadowing/session";
import styles from "@/features/speaking/speaking.module.css";

type Props = { params: Promise<{ part: string; topicId: string; questionId: string }> };

export function generateStaticParams() {
  return speakingParts.flatMap((part) =>
    speakingTopics.flatMap((topic) =>
      questionsForPart(topic, part).map((question) => ({
        part,
        topicId: topic.id,
        questionId: question.id,
      })),
    ),
  );
}

export default function AnswerPage({ params }: Props) {
  return (
    <Suspense fallback={<p role="status">Đang tải câu hỏi và bài mẫu…</p>}>
      <Answer params={params} />
    </Suspense>
  );
}

async function Answer({ params }: Props) {
  const { part, topicId, questionId } = await params;
  const topic = speakingTopics.find((item) => item.id === topicId);
  if (!topic || !isSpeakingPart(part)) notFound();

  const question = questionsForPart(topic, part).find((item) => item.id === questionId);
  const model = shadowModels.find((item) => item.id === questionId);
  if (!question || !model) notFound();

  const userId = await shadowingUser();
  return (
    <>
      <div className={styles.page}><PartNavigation part={part} /></div>
      <QuestionAudioProvider key={`${question.id}:${userId ?? "guest"}`}>
        <ShadowingPractice
          key={`${question.id}:${userId ?? "guest"}`}
          model={model}
          userId={userId}
          question={question}
          part={part}
          topicId={topic.id}
          materials={<TopicMaterials topic={topic} part={part} />}
        />
      </QuestionAudioProvider>
    </>
  );
}
