import { Suspense } from "react";
import AccountPage from "@/features/auth/AccountPage";

export default function Page({ searchParams }: PageProps<"/verify-email">) {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <AccountPage screen="verify-email" searchParams={searchParams} />
    </Suspense>
  );
}
