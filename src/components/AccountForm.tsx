"use client";

import { useState, type FormEvent } from "react";
import { MIN_PASSWORD, changePassword } from "@/lib/member";

const inputClass =
  "w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-ink aria-invalid:border-danger";

/** 로그인한 회원이 자기 비밀번호를 바꾼다. */
export function AccountForm() {
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") ?? "");
    setDone(false);
    if (password !== data.get("confirm")) return setError("비밀번호 확인이 일치하지 않습니다.");
    setBusy(true);
    const message = await changePassword(password);
    setBusy(false);
    if (message) return setError(message);
    form.reset();
    setError("");
    setDone(true);
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      onChange={() => error && setError("")}
      className="mx-auto mt-8 grid max-w-sm gap-4 rounded-xl border border-line bg-surface p-6"
    >
      <h2 className="text-lg font-bold">비밀번호 변경</h2>
      <div className="grid gap-1.5">
        <label htmlFor="new-password" className="text-sm font-semibold">
          새 비밀번호 <span className="text-xs font-normal text-muted">({MIN_PASSWORD}자 이상)</span>
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!error}
          className={inputClass}
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="new-password-confirm" className="text-sm font-semibold">
          새 비밀번호 확인
        </label>
        <input
          id="new-password-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!error}
          aria-describedby={error ? "account-error" : undefined}
          className={inputClass}
        />
        {error && (
          <p id="account-error" role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
      {done && (
        <p role="status" className="rounded-lg bg-accent-soft px-3 py-2 text-[13px]">
          비밀번호를 바꿨습니다. 다음 로그인부터 새 비밀번호를 쓰세요.
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="rounded-[9px] border border-accent bg-accent px-5 py-2.5 font-semibold text-accent-ink disabled:opacity-60"
      >
        {busy ? "바꾸는 중…" : "비밀번호 바꾸기"}
      </button>
    </form>
  );
}
