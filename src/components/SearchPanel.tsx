"use client";

import type { ReactNode } from "react";
import { PERFORMER_TYPES, type PerformerType } from "@/lib/performer";
import { EMPTY_QUERY, isEmptyQuery, type PerformerQuery } from "@/lib/search";

const field = "min-w-0 rounded-lg border border-line bg-surface px-2 py-1.5 text-ink";

function Range({
  label,
  type,
  from,
  to,
  unit,
  onFrom,
  onTo,
}: {
  label: string;
  type: "number" | "date";
  from: string;
  to: string;
  unit?: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  const width = type === "number" ? "w-20" : "w-36";
  return (
    <div role="group" aria-label={label} className="flex min-w-0 flex-wrap items-center gap-1.5">
      <span className="mr-1 text-muted">{label}</span>
      <input
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        min={type === "number" ? 0 : undefined}
        aria-label={`${label} 시작`}
        value={from}
        onChange={(e) => onFrom(e.target.value)}
        className={`${field} ${width}`}
      />
      {unit}
      <span className="text-muted">~</span>
      <input
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        min={type === "number" ? 0 : undefined}
        aria-label={`${label} 끝`}
        value={to}
        onChange={(e) => onTo(e.target.value)}
        className={`${field} ${width}`}
      />
      {unit}
    </div>
  );
}

export function SearchPanel({
  query,
  onChange,
  children,
}: {
  query: PerformerQuery;
  onChange: (q: PerformerQuery) => void;
  /** 만 나이 기준일 선택 칸 */
  children?: ReactNode;
}) {
  const set = <K extends keyof PerformerQuery>(key: K) => (value: PerformerQuery[K]) =>
    onChange({ ...query, [key]: value });

  const toggleType = (t: PerformerType) =>
    set("types")(query.types.includes(t) ? query.types.filter((x) => x !== t) : [...query.types, t]);

  return (
    <search className="mt-5 grid gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 text-[13px]">
      <input
        type="search"
        aria-label="검색어"
        placeholder="이름, 아이템, 유형, 회차(예: 12회)로 검색"
        value={query.keyword}
        onChange={(e) => set("keyword")(e.target.value)}
        className={`${field} w-full px-3 py-2 text-[15px]`}
      />

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="출연자 유형">
        <span className="mr-1 text-muted">유형</span>
        {PERFORMER_TYPES.map((t) => {
          const on = query.types.includes(t);
          return (
            <button
              key={t}
              type="button"
              aria-pressed={on}
              onClick={() => toggleType(t)}
              className={`rounded-full border px-2.5 py-1 font-semibold ${
                on ? "border-accent bg-accent text-accent-ink" : "border-line bg-bg text-ink"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
        <Range
          label="회차"
          type="number"
          from={query.episodeFrom}
          to={query.episodeTo}
          unit="회"
          onFrom={set("episodeFrom")}
          onTo={set("episodeTo")}
        />
        <Range
          label="방송일"
          type="date"
          from={query.airFrom}
          to={query.airTo}
          onFrom={set("airFrom")}
          onTo={set("airTo")}
        />
        <Range
          label="만 나이"
          type="number"
          from={query.ageFrom}
          to={query.ageTo}
          unit="세"
          onFrom={set("ageFrom")}
          onTo={set("ageTo")}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-muted">{children}</div>
        <button
          type="button"
          disabled={isEmptyQuery(query)}
          onClick={() => onChange(EMPTY_QUERY)}
          className="rounded-lg border border-line px-3 py-1.5 font-semibold text-ink disabled:opacity-40"
        >
          조건 초기화
        </button>
      </div>
    </search>
  );
}
