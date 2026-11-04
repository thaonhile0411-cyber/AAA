import { redirect } from "next/navigation";

export const instant = false;
export default function SpeakingPage() {
  redirect("/practice/cambridge-10");
}
