"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { signIn, useMember } from "@/lib/member";

/** 등록번호를 받은 회원에게만 children(출연자 관리 화면)을 보여 준다. */
export function MemberGate({ children }: { children: ReactNode }) {
  const member = useMember();
  // children은 늘 렌더링하고 회원이 확인될 때까지 숨긴다. 서버에서 children을 빼 버리면
  // Next.js가 페이지 구간을 렌더링하지 못해 즉시 이동(instant navigation) 검증에서 오류를 낸다.
  // 서버 렌더링 중(undefined)에는 회원 확인 화면도 띄우지 않아 잠깐 깜빡이지 않게 한다.
  return (
    <>
      {member === null && <SignInForm />}
      <div hidden={!member}>{children}</div>
    </>
  );
}

function SignInForm() {
  const [error, setError] = useState("");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("member") ?? "").trim();
    if (!value) setError("등록번호를 입력해 주세요.");
    else if (!signIn(value)) setError("등록되지 않은 번호입니다. 번호를 다시 확인해 주세요.");
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      onChange={() => error && setError("")}
      className="mx-auto mt-12 grid max-w-sm gap-4 rounded-xl border border-line bg-surface p-6"
    >
      <div>
        <h2 className="text-lg font-bold">회원 확인</h2>
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
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus
          placeholder="받은 등록번호를 입력해 주세요"
          aria-invalid={!!error}
          aria-describedby={error ? "member-error" : undefined}
          className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 font-mono text-ink aria-invalid:border-danger"
        />
        {error && (
          <p id="member-error" role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
      <button
        type="submit"
        className="rounded-[9px] border border-accent bg-accent px-5 py-2.5 font-semibold text-accent-ink"
      >
        들어가기
      </button>
      <p className="text-xs text-muted">등록번호가 없으면 관리자에게 요청해 주세요.</p>
    </form>
  );
}
