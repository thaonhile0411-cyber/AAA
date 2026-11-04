import { notFound } from "next/navigation";
import { Suspense } from "react";
import { writingPrompts } from "@/features/writing/prompts";
import WritingWorkspace from "@/features/writing/WritingWorkspace";

export function generateStaticParams() {
  return writingPrompts.map((prompt) => ({ promptId: prompt.id }));
}

type PromptPageProps = { params: Promise<{ promptId: string }> };

export default function PromptPage({ params }: PromptPageProps) {
  return (
    <Suspense fallback={<p role="status">Loading writing prompt…</p>}>
      <PromptContent params={params} />
    </Suspense>
  );
}

async function PromptContent({ params }: PromptPageProps) {
  const { promptId } = await params;
  const prompt = writingPrompts.find((item) => item.id === promptId);
  if (!prompt) notFound();
  return <WritingWorkspace key={prompt.id} prompt={prompt} />;
}
