import styles from "./account.module.css";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { AccountForm, PasswordInput, VerificationForm } from "@/features/auth/Form";
import {
  forgot, google, login, register, resendVerification, resetPassword, signOut, updatePassword, updateProfile, verify,
} from "@/features/auth/actions";

const titles: Record<string, string> = {
  login: "Đăng nhập",
  signup: "Tạo tài khoản",
  "verify-email": "Xác minh email",
  "forgot-password": "Quên mật khẩu",
  "reset-password": "Đặt mật khẩu mới",
  profile: "Hồ sơ của bạn",
};

function Field({ name, label, type = "text", defaultValue, required = true, autoComplete, maxLength }: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  autoComplete?: string;
  maxLength?: number;
}) {
  if (type === "password") {
    return <PasswordInput name={name} label={label} required={required} autoComplete={autoComplete} />;
  }
  return (
    <label className={styles.field}>
      {label}
      <input
        name={name} type={type} required={required} defaultValue={defaultValue}
        autoComplete={autoComplete} maxLength={maxLength}
        inputMode={name === "otp" ? "numeric" : undefined}
        pattern={name === "otp" ? "[0-9]{6}" : undefined} />
    </label>
  );
}

function Email({ defaultValue }: { defaultValue?: string }) {
  return <Field name="email" label="Email" type="email" autoComplete="email" defaultValue={defaultValue} />;
}

function NewPassword() {
  return (
    <>
      <Field name="password" label="Mật khẩu mới" type="password" autoComplete="new-password" />
      <p className="text-sm text-slate-600">Dùng ít nhất 8 ký tự, gồm chữ hoa, chữ số và ký tự đặc biệt.</p>
    </>
  );
}

async function PrivateScreen() {
  await connection();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    redirect("/login");
  }
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.from("profiles")
    .select("display_name, avatar_url").eq("id", user.id).single();
  return (
    <>
      <p className="break-all text-sm text-slate-600">{user.email}</p>
      {data?.avatar_url && (
        // eslint-disable-next-line @next/next/no-img-element -- Learners can use any HTTPS avatar host.
        <img src={data.avatar_url} alt="Ảnh đại diện của bạn" width={64} height={64}
          referrerPolicy="no-referrer" className="size-16 rounded-full object-cover" />
      )}
      {error ? <p role="alert">Chưa tải được hồ sơ.</p> : (
        <AccountForm action={updateProfile} submit="Lưu hồ sơ">
          <Field name="name" label="Tên hiển thị" defaultValue={data.display_name ?? ""} maxLength={80} />
          <Field name="avatar" label="URL ảnh đại diện (HTTPS)" type="url" required={false}
            defaultValue={data.avatar_url ?? ""} maxLength={2048} />
        </AccountForm>
      )}
      <hr className="border-slate-200" />
      <AccountForm action={updatePassword} submit="Đổi mật khẩu">
        <Field name="currentPassword" label="Mật khẩu hiện tại (nếu đã đặt)" type="password"
          required={false} autoComplete="current-password" />
        <NewPassword />
      </AccountForm>
      <Link href="/forgot-password" className="text-sm text-blue-800 underline">Quên mật khẩu hiện tại?</Link>
      <Link href="/onboarding/goals" className="block text-sm text-blue-800 underline">Về mục tiêu học tập</Link>
      <form action={signOut}>
        <button className="text-blue-800 underline">Đăng xuất</button>
      </form>
    </>
  );
}

export default async function AccountPage({ screen, searchParams }: {
  screen: string;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!Object.hasOwn(titles, screen)) notFound();
  const query = await searchParams ?? {};
  const isLogin = screen === "login";
  const isSignup = screen === "signup";

  return (
    <main className={styles.page} lang="vi">
      <Link href="/" className={styles.brand} aria-label="AAA - Trang chủ">
        <span className={styles.mark} aria-hidden="true">A<span>.</span></span>
        <span>AAA<small>YOUR IELTS JOURNEY</small></span>
      </Link>
      <section className={styles.card}>
        <header className={styles.heading}>
          <p className={styles.eyebrow}>HÀNH TRÌNH IELTS</p>
          <h1>{titles[screen]}</h1>
        </header>
        <div className={`${styles.body} space-y-5`}>
          {query.authError && isLogin && <p role="alert" className="text-sm text-red-700">Không mở được liên kết đăng nhập hoặc đặt lại mật khẩu. Hãy thử lại.</p>}
          {query.passwordReset && isLogin && <p role="status" className="text-sm text-green-800">Đã đổi mật khẩu. Bạn có thể đăng nhập lại.</p>}
          {(isLogin || isSignup) && (
            <>
              <AccountForm action={isLogin ? login : register} submit={isLogin ? "Đăng nhập" : "Đăng ký"}>
                <Email />
                {isLogin ? <Field name="password" label="Mật khẩu" type="password" autoComplete="current-password" /> : <NewPassword />}
              </AccountForm>
              <AccountForm action={google} secondary submit="Tiếp tục với Google" />
              <nav className="flex flex-wrap gap-4 text-sm text-blue-800 underline">
                <Link href={isLogin ? "/signup" : "/login"}>{isLogin ? "Tạo tài khoản" : "Đăng nhập"}</Link>
                {isLogin && <Link href="/forgot-password">Quên mật khẩu?</Link>}
              </nav>
            </>
          )}
          {screen === "verify-email" && (
            <>
              <p className="text-sm text-slate-600">Nhập mã xác minh đã gửi đến email của bạn.</p>
              <VerificationForm email={typeof query.email === "string" ? query.email : ""}
                verify={verify} resend={resendVerification} />
            </>
          )}
          {screen === "forgot-password" && (
            <AccountForm action={forgot} submit="Gửi mã đặt lại mật khẩu"><Email /></AccountForm>
          )}
          {screen === "reset-password" && (
            <>
              <p className="text-sm text-slate-600">Nếu email đã đăng ký, bạn sẽ nhận được mã đặt lại mật khẩu.</p>
              <AccountForm action={resetPassword} submit="Đặt lại mật khẩu">
                <Email defaultValue={typeof query.email === "string" ? query.email : undefined} />
                <Field name="otp" label="Mã đặt lại" autoComplete="one-time-code" maxLength={6} />
                <NewPassword />
              </AccountForm>
              <Link href="/forgot-password" className="block text-sm text-blue-800 underline">Yêu cầu mã mới</Link>
            </>
          )}
          {screen === "profile" && <PrivateScreen />}
          {screen !== "profile" && !isLogin && !isSignup && (
            <Link href="/login" className="text-sm text-blue-800 underline">Quay lại đăng nhập</Link>
          )}
        </div>
      </section>
    </main>
  );
}
