import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isSpeakingPart } from "@/features/speaking/bank";
import SpeakingBank from "@/features/speaking/SpeakingBank";
import { speakingParts } from "@/features/speaking/types";

type Props = { params: Promise<{ part: string }> };
export function generateStaticParams() {
  return speakingParts.map((part) => ({ part }));
}
export default function PartPage({ params }: Props) {
  return (
    <Suspense fallback={<p role="status">Đang tải ngân hàng Speaking…</p>}>
      <PartContent params={params} />
    </Suspense>
  );
}
async function PartContent({ params }: Props) {
  const { part } = await params;
  if (!isSpeakingPart(part)) notFound();
  return <SpeakingBank key={part} part={part} />;
}
