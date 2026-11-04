import type { Metadata } from "next";
import { PracticeLibrary } from "@/components/practice-library";
export const metadata: Metadata = {
  title: "Kho bài luyện Reading & Listening | AAA",
};
export default function PracticePage() {
  return <PracticeLibrary />;
}
