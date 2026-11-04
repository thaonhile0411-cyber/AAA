"use client";

import { useActionState, useId, useState, type ReactNode } from "react";
import styles from "./account.module.css";
import type { AuthAction } from "./actions";

export function PasswordInput({ name, label, autoComplete, required }: {
  name: string;
  label: string;
  autoComplete?: string;
  required: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <span className={styles.password}>
        <input id={id} name={name} autoComplete={autoComplete} required={required}
          type={visible ? "text" : "password"} />
        <button type="button" className={styles.toggle} aria-pressed={visible}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          onClick={() => setVisible(!visible)}>
          {visible ? "Ẩn" : "Hiện"}
        </button>
      </span>
    </div>
  );
}

export function VerificationForm({ email: initialEmail, verify, resend }: {
  email: string;
  verify: AuthAction;
  resend: AuthAction;
}) {
  const [email, setEmail] = useState(initialEmail);

  return (
    <>
      <AccountForm action={verify} submit="Xác minh email">
        <label className={styles.field}>
          Email
          <input name="email" type="email" required autoComplete="email"
            value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className={styles.field}>
          Mã xác minh
          <input name="otp" required autoComplete="one-time-code"
            inputMode="numeric" pattern="[0-9]{6}" maxLength={6} />
        </label>
      </AccountForm>
      <AccountForm action={resend} submit="Gửi lại mã" secondary>
        <input type="hidden" name="email" value={email} />
      </AccountForm>
    </>
  );
}

export function AccountForm({ action, submit, children, secondary = false }: {
  action: AuthAction;
  submit: string;
  children?: ReactNode;
  secondary?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-4">
      <fieldset disabled={pending} className="space-y-4">
        {children}
        <button className={secondary ? `${styles.submit} ${styles.secondary}` : styles.submit}>
          {pending ? "Đang xử lý…" : submit}
        </button>
      </fieldset>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.success && <p role="status" className="text-sm text-green-800">{state.success}</p>}
    </form>
  );
}
