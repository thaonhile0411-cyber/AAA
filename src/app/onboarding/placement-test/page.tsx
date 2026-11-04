import { DiagnosticTest } from "@/components/diagnostic-test";
import { connection } from "next/server";

export const metadata = {
  title: "IELTS Diagnostic Placement Test | AAA",
  description:
    "Xác định trình độ IELTS đầu vào với bài kiểm tra 4 kỹ năng Listening, Reading, Writing và Speaking.",
};

export default async function PlacementTestPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  await connection();
  const { mode } = await searchParams;
  return <DiagnosticTest reassessment={mode === "reassessment"} />;
}
