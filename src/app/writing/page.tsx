import styles from "@/features/writing/writing.module.css";
import Link from "next/link";
import { Suspense } from "react";
import { WritingPractice } from "@/features/writing/writing-practice";
import { writingPrompts } from "@/features/writing/prompts";
import { authenticatedClient } from "@/lib/supabase/server";

export default function WritingPage({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string | string[] }>;
}) {
  return (
    <main id="main-content" className={styles.page}>
      <div className={styles.container}>
        <Link href="/dashboard" className={styles.back}>
          Quay lại Dashboard
        </Link>
        <h1 className={styles.title}>IELTS Writing</h1>
        <p className={styles.intro}>
          Luyện IELTS Academic Task 1, Task 2 hoặc chọn đề từ kho US-301 để nhận phản hồi theo 4 tiêu chí IELTS.
        </p>
        <Suspense fallback={<p role="status">Đang tải đề Writing…</p>}>
          <Practice searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function Practice({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string | string[] }>;
}) {
  const { userId } = await authenticatedClient();
  const { prompt } = await searchParams;
  const initialPromptId = typeof prompt === "string" ? prompt : undefined;
  return <WritingPractice key={userId} prompts={writingPrompts} initialPromptId={initialPromptId} />;
}
