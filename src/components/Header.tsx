"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "출연자 목록" },
  { href: "/new", label: "출연자 등록" },
];

export function Header() {
  const pathname = usePathname();
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-4">
      <div>
        <small className="block text-xs font-semibold tracking-[0.12em] text-muted">
          CEN · 출연자 관리
        </small>
        <h1 className="mt-0.5 font-display text-2xl leading-tight sm:text-3xl">
          인생의 <span className="text-accent">연장전</span>
        </h1>
      </div>
      <nav
        aria-label="화면 이동"
        className="flex gap-1 rounded-[10px] border border-line bg-surface p-1"
      >
        {TABS.map((tab) => {
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
    </header>
  );
}
