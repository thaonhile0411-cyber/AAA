import { DiagnosticTest } from "@/components/diagnostic-test";

// This page reads request-specific search params to select placement or
// reassessment mode, so it must be allowed to render as a blocking route.
export const instant = false;

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
  const { mode } = await searchParams;
  return <DiagnosticTest reassessment={mode === "reassessment"} />;
}
