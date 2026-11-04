import Link from "next/link";
import { Suspense } from "react";
import { authenticatedClient } from "@/lib/supabase/server";

export default function DashboardPage() {
  return (
    <Suspense fallback={<p role="status">Đang tải dashboard…</p>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  await authenticatedClient();
  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold text-slate-900">
          IELTS Learning Dashboard
        </h1>
        <nav className="mt-4 flex gap-4 text-blue-800 underline">
          <Link href="/profile">Hồ sơ cá nhân</Link>
          <Link href="/onboarding/goals">Mục tiêu học tập</Link>
        </nav>

        <p className="mt-3 text-slate-600">
          Theo dõi mục tiêu, luyện tập và xem tiến độ học IELTS của bạn.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {["Listening", "Reading", "Writing", "Speaking"].map((skill) => (
            <section
              key={skill}
              className="rounded-xl border border-slate-200 bg-white p-6"
            >
              <h2 className="text-xl font-semibold text-slate-900">
                {skill}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Chức năng luyện tập sẽ được nhóm phát triển.
              </p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
