import type { Metadata } from "next";
import { PracticeLibrary } from "@/components/practice-library";
export const metadata: Metadata = {
  title: "Kho bài luyện IELTS | AAA",
};
export default function PracticePage() {
  return <PracticeLibrary />;
}
