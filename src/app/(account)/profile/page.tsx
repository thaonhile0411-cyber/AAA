import { Suspense } from "react";
import AccountPage from "@/features/auth/AccountPage";

export default function Page() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <AccountPage screen="profile" />
    </Suspense>
  );
}
