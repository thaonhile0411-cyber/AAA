import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ProgressWorkspace } from "@/components/progress-workspace";
import { loadAssessmentComparison } from "@/lib/assessment-comparison";
import { authenticatedClient } from "@/lib/supabase/server";

export const instant = false;

export const metadata: Metadata = { title: "Tiến bộ của tôi | AAA" };

export default async function ProgressPage() {
  const { supabase, userId } = await authenticatedClient();
  const comparison = await loadAssessmentComparison(supabase, userId);
  return <AppShell active="roadmap"><ProgressWorkspace comparison={comparison} /></AppShell>;
}
