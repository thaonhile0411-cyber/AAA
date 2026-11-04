import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Writing practice · AAA IELTS",
  description:
    "IELTS Writing Task 1 and Task 2 prompts with outlines, vocabulary and sample essays.",
};
export default function WritingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell active="writing">{children}</AppShell>;
}
