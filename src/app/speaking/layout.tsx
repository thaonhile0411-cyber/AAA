import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Speaking Question & Model Answer · AAA IELTS",
  description:
    "Ngân hàng câu hỏi IELTS Speaking Part 1, Part 2, Part 3 với audio, cue card, từ vựng IPA và gợi ý ngữ pháp.",
};
export default function SpeakingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell active="speaking">{children}</AppShell>;
}
