"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  FIRST_ADMIN,
  MIN_PASSWORD,
  canEdit,
  needsFirstAdmin,
  setUpFirstAdmin,
  signIn,
  useMember,
} from "@/lib/member";

/** 로그인한 회원에게만 children(출연자 관리 화면)을 보여 준다. */
export function MemberGate({ children }: { children: ReactNode }) {
  const member = useMember();
  // children은 늘 렌더링하고 로그인할 때까지 숨긴다. 서버에서 children을 빼 버리면
  // Next.js가 페이지 구간을 렌더링하지 못해 즉시 이동(instant navigation) 검증에서 오류를 낸다.
  // 회원이 바뀌면 key가 바뀌어 화면을 새로 그리고, 그 회원의 데이터를 다시 불러온다.
  return (
    <>
      {member === null && <SignInScreen />}
      <div hidden={!member} key={member?.id ?? "guest"}>
        {children}
      </div>
    </>
  );
}

/** 편집 권한(또는 관리자 권한)이 있는 회원에게만 children을 보여 준다. */
export function RequireRole({ role, children }: { role: "editor" | "admin"; children: ReactNode }) {
  const member = useMember();
  const allowed = role === "admin" ? member?.role === "admin" : canEdit(member);
  // MemberGate와 같은 이유로 children을 빼지 않고 숨긴다. 권한은 서버(RLS·Edge Function)가 한 번 더 막는다.
  return (
    <>
      {member && !allowed && (
        <p className="mt-8 rounded-xl border border-dashed border-line px-4 py-10 text-center text-muted">
          {role === "admin" ? "관리자만 볼 수 있는 화면입니다." : "편집 권한이 있는 회원만 출연자를 등록할 수 있습니다."}
        </p>
      )}
      <div hidden={!allowed}>{children}</div>
    </>
  );
}

function SignInScreen() {
  // 회원이 한 명도 없으면 첫 관리자 설정 화면을 띄운다.
  const [firstAdmin, setFirstAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    needsFirstAdmin()
      .then(setFirstAdmin)
      .catch(() => setFirstAdmin(false));
  }, []);
  if (firstAdmin === null) return null;
  return firstAdmin ? <FirstAdminForm /> : <SignInForm />;
}

const card = "mx-auto mt-12 grid max-w-sm gap-4 rounded-xl border border-line bg-surface p-6";
const inputClass =
  "w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-ink aria-invalid:border-danger";
const submitClass =
  "rounded-[9px] border border-accent bg-accent px-5 py-2.5 font-semibold text-accent-ink disabled:cursor-progress disabled:opacity-60";

function SignInForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    const message = await signIn(String(data.get("member") ?? ""), String(data.get("password") ?? ""));
    setBusy(false);
    if (message) setError(message);
  }

  return (
    <form noValidate onSubmit={onSubmit} onChange={() => error && setError("")} className={card}>
      <div>
        <h2 className="text-lg font-bold">회원 로그인</h2>
        <p className="mt-1 text-[13px] text-muted">
          등록번호를 받은 회원만 출연자 관리 화면에 들어갈 수 있습니다.
        </p>
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="member" className="text-sm font-semibold">
          등록번호
        </label>
        <input
          id="member"
          name="member"
          type="text"
          autoComplete="username"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus
          placeholder="받은 등록번호를 입력해 주세요"
          aria-invalid={!!error}
          className={`${inputClass} font-mono`}
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="password" className="text-sm font-semibold">
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!error}
          aria-describedby={error ? "signin-error" : undefined}
          className={inputClass}
        />
        {error && (
          <p id="signin-error" role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
      <button type="submit" disabled={busy} className={submitClass}>
        {busy ? "확인하는 중…" : "들어가기"}
      </button>
      <p className="text-xs text-muted">등록번호나 비밀번호를 모르면 관리자에게 요청해 주세요.</p>
    </form>
  );
}

function FirstAdminForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password") ?? "");
    if (password.length < MIN_PASSWORD) return setError(`비밀번호는 ${MIN_PASSWORD}자 이상이어야 합니다.`);
    if (password !== data.get("confirm")) return setError("비밀번호 확인이 일치하지 않습니다.");
    setBusy(true);
    const message = await setUpFirstAdmin(String(data.get("name") ?? "").trim(), password);
    setBusy(false);
    if (message) setError(message);
  }

  return (
    <form noValidate onSubmit={onSubmit} onChange={() => error && setError("")} className={card}>
      <div>
        <h2 className="text-lg font-bold">첫 관리자 설정</h2>
        <p className="mt-1 text-[13px] text-muted">
          아직 회원이 없습니다. 관리자 등록번호 <b className="font-mono text-ink">{FIRST_ADMIN}</b>의 비밀번호를
          정해 주세요. 이 화면은 처음 한 번만 나옵니다.
        </p>
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="admin-name" className="text-sm font-semibold">
          이름 <span className="text-xs font-normal text-muted">(선택)</span>
        </label>
        <input id="admin-name" name="name" type="text" autoComplete="name" className={inputClass} />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="admin-password" className="text-sm font-semibold">
          비밀번호 <span className="text-xs font-normal text-muted">({MIN_PASSWORD}자 이상)</span>
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="new-password"
          autoFocus
          aria-invalid={!!error}
          className={inputClass}
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="admin-confirm" className="text-sm font-semibold">
          비밀번호 확인
        </label>
        <input
          id="admin-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!error}
          aria-describedby={error ? "first-admin-error" : undefined}
          className={inputClass}
        />
        {error && (
          <p id="first-admin-error" role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
      <button type="submit" disabled={busy} className={submitClass}>
        {busy ? "설정하는 중…" : `${FIRST_ADMIN} 관리자로 시작하기`}
      </button>
    </form>
  );
}
