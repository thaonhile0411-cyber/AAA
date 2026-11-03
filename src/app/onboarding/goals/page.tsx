import { GoalSurvey } from "@/components/goal-survey";
import { Suspense } from "react";
import { authenticatedClient } from "@/lib/supabase/server";
import "./survey.css";

export default function GoalsPage() {
  return (
    <Suspense fallback={<p role="status">Đang tải khảo sát…</p>}>
      <AuthenticatedSurvey />
    </Suspense>
  );
}

async function AuthenticatedSurvey() {
  await authenticatedClient();
  return <GoalSurvey />;
}
