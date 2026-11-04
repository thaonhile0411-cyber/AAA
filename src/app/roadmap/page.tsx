import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { RoadmapWorkspace } from "@/components/roadmap-workspace";
import { loadActiveRoadmap } from "@/lib/active-roadmap";
import { authenticatedClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Lộ trình của tôi | AAA" };

export default async function RoadmapPage() {
  const { supabase, userId } = await authenticatedClient();
  const roadmap = await loadActiveRoadmap(supabase, userId);
  return <AppShell active="roadmap"><RoadmapWorkspace initialRoadmap={roadmap} /></AppShell>;
}
