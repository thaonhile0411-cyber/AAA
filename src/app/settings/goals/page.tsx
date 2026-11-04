import { GoalSurvey } from "@/components/goal-survey";
import { Suspense } from "react";
import { authenticatedClient } from "@/lib/supabase/server";

export default function GoalSettingsPage() {
  return (
    <Suspense fallback={<p role="status">Đang tải cài đặt mục tiêu…</p>}>
      <AuthenticatedGoalSettings />
    </Suspense>
  );
}

async function AuthenticatedGoalSettings() {
  await authenticatedClient();
  return <GoalSurvey mode="settings" />;
}
