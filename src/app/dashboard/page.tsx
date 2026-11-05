import { Suspense } from "react";
import { authenticatedClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/features/dashboard/Dashboard";
export default function DashboardPage() {
  return (
    <AppShell active="dashboard">
      <Suspense fallback={<p role="status">Đang tải tiến độ học tập…</p>}>
        <Overview />
      </Suspense>
    </AppShell>
  );
}
async function Overview() {
  const { supabase, userId } = await authenticatedClient();
  const { data, error } = await supabase.rpc("dashboard_overview");
  return (
    <Dashboard key={userId} initial={error ? null : data} userId={userId} />
  );
}
