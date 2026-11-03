import { GoalSurvey } from "@/components/goal-survey";
import { Suspense } from "react";
export default function GoalSettingsPage() {
  return (
    <Suspense fallback={<p>Đang tải mục tiêu…</p>}>
      <GoalSurvey mode="settings" />
    </Suspense>
  );
}
