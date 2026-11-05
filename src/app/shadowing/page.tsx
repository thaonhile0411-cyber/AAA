import { redirect } from "next/navigation";

export default function LegacyShadowingPage() {
  // Shadowing is selected from a Speaking question's model answer. Start at
  // the question bank instead of the unrelated Cambridge practice page.
  redirect("/speaking/part-1");
}
