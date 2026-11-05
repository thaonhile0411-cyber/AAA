import type { Metadata } from "next";
import { CambridgeIelts10 } from "@/components/cambridge-ielts-10";
import { Suspense } from 'react';
import { authenticatedClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: "Cambridge IELTS 10 | AAA",
};

export default function CambridgeIelts10Page({ searchParams }: { searchParams: Promise<{ task?: string; skill?: string }> }) {
  return <Suspense fallback={<p role="status">Đang tải kho tài liệu…</p>}><Workspace searchParams={searchParams} /></Suspense>;
}
async function Workspace({ searchParams }: { searchParams: Promise<{ task?: string; skill?: string }> }) {
  const { task, skill } = await searchParams;
  const { supabase, userId } = await authenticatedClient();
  if (task && /^[0-9a-f-]{36}$/i.test(task)) {
    const { data } = await supabase.from('user_roadmaps').select('task_id,skill').eq('task_id',task).eq('user_id',userId).eq('resource_slug','cambridge-10').eq('status','active').maybeSingle();
    if (data) return <CambridgeIelts10 userId={userId} taskId={data.task_id} initialSkill={data.skill} />;
  }
  return <CambridgeIelts10 userId={userId} initialSkill={skill} />;
}
