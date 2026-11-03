import { Suspense } from "react";
import AccountPage from "@/features/auth/AccountPage";

export default function Page({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <AccountPage screen="login" searchParams={searchParams} />
    </Suspense>
  );
}
