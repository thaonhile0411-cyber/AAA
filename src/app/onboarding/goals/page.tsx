import { GoalSurvey } from "@/components/goal-survey";
import { Suspense } from "react";

export default function GoalsPage() {
  return (
    <Suspense fallback={<p>Đang tải mục tiêu…</p>}>
      <GoalSurvey />
    </Suspense>
  );
}
