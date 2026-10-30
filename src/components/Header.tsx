"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROLE_LABELS, canEdit, signOut, useMember, type Member } from "@/lib/member";

const TABS: { href: string; label: string; show: (m: Member) => boolean }[] = [
  { href: "/", label: "출연자 목록", show: () => true },
  { href: "/new", label: "출연자 등록", show: canEdit },
  { href: "/admin", label: "회원 관리", show: (m) => m.role === "admin" },
];

export function Header() {
  const pathname = usePathname();
  const member = useMember();
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-4">
      <h1 className="font-display text-2xl leading-tight sm:text-3xl">
        센 미디어 - <span className="text-accent">출연자 관리</span>
      </h1>
      {member && (
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
          <span className="text-xs text-muted">
            <span className="font-mono">{member.number}</span>
            {member.name && <span className="ml-1">{member.name}</span>}
            <span className="ml-1">· {ROLE_LABELS[member.role]}</span>
            <Link href="/account" className="ml-2 font-semibold text-accent underline underline-offset-4">
              비밀번호 변경
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="ml-2 font-semibold text-accent underline underline-offset-4"
            >
              나가기
            </button>
          </span>
          <nav
            aria-label="화면 이동"
            className="flex gap-1 rounded-[10px] border border-line bg-surface p-1"
          >
            {TABS.filter((tab) => tab.show(member)).map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-[7px] px-3.5 py-2 text-sm font-semibold ${
                    active ? "bg-accent text-accent-ink" : "text-muted"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
