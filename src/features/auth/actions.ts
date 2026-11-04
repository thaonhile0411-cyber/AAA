"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { applicationOrigin, destination } from "./flow";

export type AuthState = { error?: string; success?: string };
export type AuthAction = (state: AuthState, form: FormData) => Promise<AuthState>;

function value(form: FormData, name: string) {
  const field = form.get(name);
  return typeof field === "string" ? field : "";
}

function validPassword(password: string) {
  return password.length >= 8 && new TextEncoder().encode(password).length <= 72
    && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[\p{P}\p{S}]/u.test(password);
}

const passwordError = "Dùng ít nhất 8 ký tự (tối đa 72 byte), gồm chữ hoa, chữ số và ký tự đặc biệt.";

async function client() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return null;
  }
  return supabaseServer();
}

const unavailable = { error: "Chưa kết nối được dịch vụ tài khoản. Hãy thử lại sau." };

export const register: AuthAction = async (_, form) => {
  const email = value(form, "email").trim();
  const password = value(form, "password");
  if (!validPassword(password)) return { error: passwordError };
  const supabase = await client();
  if (!supabase) return unavailable;
  const { data, error } = await supabase.auth.signUp({ email, password });
  // With email confirmation enabled, Supabase may return a fake user with no identities.
  if (error?.code === "user_already_exists" || error?.code === "email_exists" || data.user?.identities?.length === 0) {
    return { error: "Email này đã được dùng để tạo tài khoản. Hãy đăng nhập hoặc đặt lại mật khẩu." };
  }
  if (error) return { error: "Chưa đăng ký được. Hãy kiểm tra thông tin và thử lại." };
  if (data.session) {
    await supabase.auth.signOut({ scope: "local" });
    return { error: "Dịch vụ xác minh email chưa được cấu hình." };
  }
  redirect("/verify-email?email=" + encodeURIComponent(email));
};

export const verify: AuthAction = async (_, form) => {
  const token = value(form, "otp").trim();
  if (!/^\d{6}$/.test(token)) return { error: "Mã xác minh phải có 6 chữ số." };
  const supabase = await client();
  if (!supabase) return unavailable;
  const { data, error } = await supabase.auth.verifyOtp({
    email: value(form, "email").trim(),
    token,
    type: "signup",
  });
  if (error || !data.user) return { error: "Mã xác minh không đúng hoặc đã hết hạn." };
  redirect("/onboarding/goals");
};

export const resendVerification: AuthAction = async (_, form) => {
  const email = value(form, "email").trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Vui lòng nhập email hợp lệ trước khi gửi lại mã." };
  }
  const supabase = await client();
  if (!supabase) return unavailable;
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) return { error: "Chưa gửi lại được mã. Hãy đợi một lúc rồi thử lại." };
  return { success: "Nếu tài khoản đang chờ xác minh, bạn sẽ nhận được mã mới." };
};

export const login: AuthAction = async (_, form) => {
  const supabase = await client();
  if (!supabase) return unavailable;
  const { data, error } = await supabase.auth.signInWithPassword({
    email: value(form, "email").trim(),
    password: value(form, "password"),
  });
  if (error?.code === "email_not_confirmed") {
    redirect("/verify-email?email=" + encodeURIComponent(value(form, "email").trim()));
  }
  if (error) return { error: "Email hoặc mật khẩu chưa đúng, hoặc bạn đã thử quá nhiều lần." };
  redirect(await destination(supabase, data.user.id));
};

export const google: AuthAction = async () => {
  const supabase = await client();
  if (!supabase) return unavailable;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: applicationOrigin() + "/auth/callback" },
  });
  if (error || !data.url) return { error: "Chưa mở được đăng nhập Google. Hãy thử lại." };
  redirect(data.url);
};

export const forgot: AuthAction = async (_, form) => {
  const supabase = await client();
  if (!supabase) return unavailable;
  const { error } = await supabase.auth.resetPasswordForEmail(value(form, "email").trim(), {
    redirectTo: applicationOrigin() + "/auth/callback",
  });
  if (error && error.status !== 404) return { error: "Chưa gửi được mã. Hãy thử lại sau." };
  redirect("/reset-password?email=" + encodeURIComponent(value(form, "email").trim()));
};

export const resetPassword: AuthAction = async (_, form) => {
  const password = value(form, "password");
  const token = value(form, "otp").trim();
  if (!validPassword(password)) return { error: passwordError };
  if (!/^\d{6}$/.test(token)) return { error: "Mã xác minh phải có 6 chữ số." };
  const supabase = await client();
  if (!supabase) return unavailable;
  const { error } = await supabase.auth.verifyOtp({
    email: value(form, "email").trim(), token, type: "recovery",
  });
  if (error) return { error: "Mã đặt lại mật khẩu không đúng hoặc đã hết hạn." };
  const result = await supabase.auth.updateUser({ password });
  await supabase.auth.signOut({ scope: "local" });
  if (result.error) return { error: "Chưa đổi được mật khẩu. Hãy yêu cầu mã mới và thử lại." };
  redirect("/login?passwordReset=1");
};

export const updatePassword: AuthAction = async (_, form) => {
  const password = value(form, "password");
  if (!validPassword(password)) return { error: passwordError };
  const supabase = await client();
  if (!supabase) return unavailable;
  const current = value(form, "currentPassword");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.identities?.some((identity) => identity.provider === "email") && !current) {
    return { error: "Nhập mật khẩu hiện tại hoặc dùng chức năng quên mật khẩu." };
  }
  const { error } = await supabase.auth.updateUser({
    password,
    ...(current ? { current_password: current } : {}),
  });
  if (error) return { error: "Chưa đổi được mật khẩu. Hãy kiểm tra mật khẩu hiện tại hoặc dùng mã đặt lại." };
  return { success: "Đã đổi mật khẩu." };
};

export const updateProfile: AuthAction = async (_, form) => {
  const name = value(form, "name").trim();
  const avatar = value(form, "avatar").trim();
  if (!name || name.length > 80) return { error: "Tên hiển thị phải dài từ 1 đến 80 ký tự." };
  if (avatar && (avatar.length > 2048 || URL.parse(avatar)?.protocol !== "https:")) {
    return { error: "Nhập đường dẫn HTTPS hợp lệ cho ảnh đại diện." };
  }
  const supabase = await client();
  if (!supabase) return unavailable;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.from("profiles").update({
    display_name: name, avatar_url: avatar || null,
  }).eq("id", user.id).select("id").single();
  if (error) return { error: "Chưa lưu được hồ sơ. Hãy thử lại." };
  revalidatePath("/profile");
  return { success: "Đã lưu hồ sơ." };
};

export async function signOut() {
  const supabase = await client();
  await supabase?.auth.signOut({ scope: "local" });
  redirect("/login");
}
