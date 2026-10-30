"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  MIN_PASSWORD,
  ROLES,
  ROLE_LABELS,
  callAdmin,
  normalizeNumber,
  useMember,
  type Role,
} from "@/lib/member";

type MemberRow = { id: string; number: string; name: string; role: Role; active: boolean; created_at: string };

const inputClass = "w-full rounded-lg border border-line bg-bg px-3 py-2 text-ink aria-invalid:border-danger";
const smallButton = "rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-semibold";

const fetchMembers = () =>
  callAdmin<{ members: MemberRow[] }>({ action: "list" }).then((r) => r.members);

/** 헷갈리기 쉬운 글자(0·O, 1·l·I)를 뺀 임시 비밀번호 */
function randomPassword(length = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

/** 아직 발급하지 않은 가장 작은 번호 */
function nextFreeNumber(members: MemberRow[]): string {
  const used = new Set(members.map((m) => m.number));
  for (let i = 1; i <= 9999; i++) {
    const n = `CEN-${String(i).padStart(4, "0")}`;
    if (!used.has(n)) return n;
  }
  return "";
}

export function MemberAdmin() {
  const me = useMember();
  const isAdmin = me?.role === "admin";
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [error, setError] = useState("");
  /** 방금 발급했거나 재설정한 비밀번호. 회원에게 전달할 수 있게 한 번만 보여 준다. */
  const [handover, setHandover] = useState<{ number: string; password: string } | null>(null);

  const load = useCallback(
    () =>
      fetchMembers()
        .then(setMembers)
        .catch((e: Error) => setError(e.message)),
    [],
  );

  useEffect(() => {
    if (!isAdmin) return;
    fetchMembers()
      .then(setMembers)
      .catch((e: Error) => setError(e.message));
  }, [isAdmin]);

  async function update(row: MemberRow, patch: Record<string, unknown>, password?: string) {
    setError("");
    try {
      await callAdmin({ action: "update", id: row.id, ...patch });
      if (password) setHandover({ number: row.number, password });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <section className="mt-5 grid gap-4">
      <CreateMember
        suggested={members ? nextFreeNumber(members) : ""}
        onCreated={async (number, password) => {
          setHandover({ number, password });
          await load();
        }}
      />

      {handover && (
        <div role="status" className="rounded-xl border border-accent bg-accent-soft px-4 py-3 text-[13px]">
          <p>
            <b className="font-mono">{handover.number}</b>의 비밀번호:{" "}
            <b className="font-mono text-base select-all">{handover.password}</b>
          </p>
          <p className="mt-1 text-muted">
            이 비밀번호는 지금만 보입니다. 회원에게 전달하고, 처음 로그인한 뒤 &lsquo;비밀번호 변경&rsquo;에서 바꾸도록
            안내해 주세요.
          </p>
          <button type="button" onClick={() => setHandover(null)} className={`${smallButton} mt-2`}>
            전달했어요
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-accent-soft px-3 py-2.5 text-[13px] text-danger">
          {error}
        </p>
      )}

      <div className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-3 text-[13px] font-bold tracking-wide text-accent">
          발급한 등록번호 {members && <span className="font-mono">{members.length}</span>}
        </h2>
        {!members ? (
          <p className="text-[13px] text-muted">불러오는 중…</p>
        ) : (
          <ul className="grid gap-2">
            {members.map((m) => (
              <MemberItem key={m.id} row={m} self={m.id === me?.id} onUpdate={update} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function CreateMember({
  suggested,
  onCreated,
}: {
  suggested: string;
  onCreated: (number: string, password: string) => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // 비워 두면 발급할 때 임시 비밀번호를 만든다. (미리 만들어 두면 서버 렌더링 중에 난수를 쓰게 된다)
  const [password, setPassword] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const number = normalizeNumber(String(data.get("number") ?? "") || suggested);
    if (!number) return setError("등록번호는 CEN-0001부터 CEN-9999 사이로 적어 주세요.");
    const initial = password || randomPassword();
    if (initial.length < MIN_PASSWORD) return setError(`비밀번호는 ${MIN_PASSWORD}자 이상이어야 합니다.`);
    setBusy(true);
    setError("");
    try {
      await callAdmin({
        action: "create",
        number,
        name: String(data.get("name") ?? "").trim(),
        role: data.get("role"),
        password: initial,
      });
      form.reset();
      setPassword("");
      await onCreated(number, initial);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2"
    >
      <h2 className="text-[13px] font-bold tracking-wide text-accent sm:col-span-2">새 등록번호 발급</h2>
      <label className="grid gap-1 text-sm font-semibold">
        등록번호
        <input
          name="number"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={suggested ? `비우면 ${suggested}` : "CEN-0002"}
          className={`${inputClass} font-mono font-normal`}
        />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        이름 <span className="sr-only">(선택)</span>
        <input name="name" type="text" autoComplete="off" placeholder="예: 김OO 작가" className={`${inputClass} font-normal`} />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        권한
        <select name="role" defaultValue="viewer" className={`${inputClass} font-normal`}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        처음 비밀번호
        <span className="flex gap-1.5">
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="비우면 자동으로 만듭니다"
            className={`${inputClass} font-mono font-normal`}
          />
          <button type="button" onClick={() => setPassword(randomPassword())} className={smallButton}>
            새로 만들기
          </button>
        </span>
      </label>
      {error && (
        <p role="alert" className="text-xs text-danger sm:col-span-2">
          {error}
        </p>
      )}
      <div className="flex justify-end sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-[9px] border border-accent bg-accent px-5 py-2 font-semibold text-accent-ink disabled:opacity-60"
        >
          {busy ? "발급하는 중…" : "발급하기"}
        </button>
      </div>
    </form>
  );
}

function MemberItem({
  row,
  self,
  onUpdate,
}: {
  row: MemberRow;
  self: boolean;
  onUpdate: (row: MemberRow, patch: Record<string, unknown>, password?: string) => Promise<void>;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <li
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line px-3 py-2 text-sm ${
        row.active ? "" : "opacity-60"
      }`}
    >
      <span className="font-mono font-semibold">{row.number}</span>
      <span className="min-w-0 flex-1 truncate">{row.name || <span className="text-muted">이름 없음</span>}</span>
      {!row.active && <span className="rounded-full bg-t-worse-bg px-2 py-0.5 text-xs text-t-worse">차단됨</span>}
      <select
        aria-label={`${row.number} 권한`}
        value={row.role}
        disabled={self}
        onChange={(e) => onUpdate(row, { role: e.target.value })}
        className="rounded-md border border-line bg-bg px-2 py-1 text-xs"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      {confirmReset ? (
        <span className="flex items-center gap-1.5 text-xs">
          비밀번호를 새로 만들까요?
          <button type="button" onClick={() => setConfirmReset(false)} className={smallButton}>
            취소
          </button>
          <button
            type="button"
            onClick={async () => {
              const password = randomPassword();
              await onUpdate(row, { password }, password);
              setConfirmReset(false);
            }}
            className={`${smallButton} text-accent`}
          >
            새로 만들기
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setConfirmReset(true)} className={smallButton}>
          비밀번호 재설정
        </button>
      )}
      {!self && (
        <button
          type="button"
          onClick={() => onUpdate(row, { active: !row.active })}
          className={`${smallButton} ${row.active ? "text-danger" : "text-accent"}`}
        >
          {row.active ? "차단" : "차단 해제"}
        </button>
      )}
      {self && <span className="text-xs text-muted">(나)</span>}
    </li>
  );
}
