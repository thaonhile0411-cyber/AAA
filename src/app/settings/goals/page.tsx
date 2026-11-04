import { GoalSurvey } from "@/components/goal-survey";
import { Suspense } from "react";

export default function GoalSettingsPage() {
  return (
    <Suspense fallback={<p role="status">Đang tải cài đặt mục tiêu…</p>}>
      <GoalSurvey mode="settings" />
    </Suspense>
  );
}
