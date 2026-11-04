import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Shadowing practice · AAA IELTS",
  description:
    "Luyện nói từng câu với transcript đồng bộ, lặp câu và bản thu cá nhân trên thiết bị.",
};
export default function ShadowingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell active="shadowing">{children}</AppShell>;
}
