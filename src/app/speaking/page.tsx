import { redirect } from "next/navigation";

export const instant = false;
export default function SpeakingPage() {
  redirect("/speaking/part-1");
}
