import { Suspense } from "react";
import AccountPage from "@/features/auth/AccountPage";

export default function Page({ searchParams }: PageProps<"/reset-password">) {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <AccountPage screen="reset-password" searchParams={searchParams} />
    </Suspense>
  );
}
