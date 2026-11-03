"use client";

import { useRouter } from "next/navigation";
import { GoalSurvey } from "@/components/goal-survey";

export default function GoalsPage() {
  const router = useRouter();

  return (
    <GoalSurvey
      onSaveSuccess={() => {
        router.push("/onboarding/placement-test");
      }}
    />
  );
}
