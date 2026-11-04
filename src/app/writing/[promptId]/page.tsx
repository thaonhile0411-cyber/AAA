import { notFound } from "next/navigation";
import { writingPrompts } from "@/features/writing/prompts";
import WritingWorkspace from "@/features/writing/WritingWorkspace";

export function generateStaticParams() {
  return writingPrompts.map((prompt) => ({ promptId: prompt.id }));
}

export default async function PromptPage({
  params,
}: {
  params: Promise<{ promptId: string }>;
}) {
  const { promptId } = await params;
  const prompt = writingPrompts.find((item) => item.id === promptId);
  if (!prompt) notFound();
  return <WritingWorkspace key={prompt.id} prompt={prompt} />;
}
