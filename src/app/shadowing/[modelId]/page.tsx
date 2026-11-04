import { Suspense } from "react";
import { notFound } from "next/navigation";
import { shadowModels } from "@/features/shadowing/data";
import { shadowingUser } from "@/features/shadowing/session";
import ShadowingPractice from "@/features/shadowing/ShadowingPractice";

type Props = { params: Promise<{ modelId: string }> };
export function generateStaticParams() {
  return shadowModels.map((model) => ({ modelId: model.id }));
}
export default function ModelPage({ params }: Props) {
  return (
    <Suspense fallback={<p role="status">Đang tải phòng luyện Shadowing…</p>}>
      <Practice params={params} />
    </Suspense>
  );
}
async function Practice({ params }: Props) {
  const { modelId } = await params;
  const model = shadowModels.find((item) => item.id === modelId);
  if (!model) notFound();
  const userId = await shadowingUser();
  return (
    <ShadowingPractice
      key={`${model.id}:${userId ?? "guest"}`}
      model={model}
      userId={userId}
    />
  );
}
