import { redirect } from "next/navigation";

// This route redirects immediately and has no page shell to validate.
export const instant = false;

export default function Home() {
  redirect("/login");
}
