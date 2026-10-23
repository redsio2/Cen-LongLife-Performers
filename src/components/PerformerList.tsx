"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDate, manAge } from "@/lib/date";
import { ATTACHMENT_CATEGORIES, type Attachment, type Performer } from "@/lib/performer";
import { listPerformers } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import { FileThumb } from "./FileThumb";
import { ImageViewer } from "./ImageViewer";
import { TypeBadge } from "./TypeBadge";

type RefMode = "today" | "air" | "custom";

const categoryLabel = (key: Attachment["category"]) =>
  ATTACHMENT_CATEGORIES.find((c) => c.key === key)?.label ?? "";

export function PerformerList() {
  const [performers, setPerformers] = useState<Performer[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [refMode, setRefMode] = useState<RefMode>("today");
  const [refDate, setRefDate] = useState("");
  const [viewing, setViewing] = useState<{ blob: Blob; caption: string } | null>(null);

  useEffect(() => {
    listPerformers()
      .then(setPerformers)
      .catch(() => {
        setLoadError(true);
        setPerformers([]);
      });
  }, []);

  const today = useToday();
  const referenceFor = (p: Performer) =>
    refMode === "air" ? p.airDate : refMode === "custom" ? refDate || today : today;
  const referenceLabel =
    refMode === "air" ? "방송일 기준" : refMode === "custom" ? `${formatDate(refDate || today)} 기준` : "오늘 기준";

  return (
    <section>
      <div className="mt-5 mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="font-semibold">
          등록된 출연자 <b className="font-mono text-accent">{performers?.length ?? 0}</b>명 · 최신 등록순
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
          <label htmlFor="ref-mode">만 나이 기준</label>
          <select
            id="ref-mode"
            value={refMode}
            onChange={(e) => setRefMode(e.target.value as RefMode)}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-ink"
          >
            <option value="today">오늘</option>
            <option value="air">각 방송일</option>
            <option value="custom">날짜 지정</option>
          </select>
          {refMode === "custom" && (
            <input
              type="date"
              aria-label="기준 날짜"
              value={refDate || today}
              onChange={(e) => setRefDate(e.target.value)}
              className="rounded-lg border border-line bg-surface px-2 py-1.5 text-ink"
            />
          )}
        </div>
      </div>

      {loadError && (
        <p className="mb-3 rounded-lg bg-accent-soft px-3 py-2.5 text-[13px] text-muted">
          이 브라우저에서 저장된 출연자를 불러오지 못했습니다. 사생활 보호 모드라면 일반 창에서 열어 주세요.
        </p>
      )}

      {performers && performers.length === 0 && !loadError && (
        <div className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-muted">
          <p>아직 등록된 출연자가 없습니다.</p>
          <Link href="/new" className="mt-2 inline-block font-semibold text-accent underline underline-offset-4">
            첫 출연자 등록하기
          </Link>
        </div>
      )}

      <div className="grid gap-2.5">
        {performers?.map((p) => {
          const age = manAge(p.birth, referenceFor(p));
          return (
            <article
              key={p.id}
              className="grid grid-cols-1 gap-x-4 gap-y-1 rounded-xl border border-line bg-surface px-4 py-3.5 sm:grid-cols-[92px_1fr]"
            >
              <div className="flex items-baseline gap-2.5 sm:row-span-3 sm:block sm:border-r sm:border-line sm:pr-3">
                <div className="font-mono text-[22px] leading-tight text-accent">
                  {p.episode}
                  <small className="ml-px font-sans text-xs text-muted">회</small>
                </div>
                <div className="text-xs text-muted tabular-nums sm:mt-1">{formatDate(p.airDate)}</div>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-lg font-bold">{p.name}</span>
                <TypeBadge performer={p} />
                <span className="font-mono text-sm" title={referenceLabel}>
                  {age == null || age < 0 ? "만 나이 -" : `만 ${age}세`}
                </span>
              </div>
              <div className="min-w-0 break-words">
                <b className="mr-1.5 text-[13px] font-medium text-muted">아이템</b>
                {p.item}
              </div>
              <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[13px] text-muted tabular-nums">
                <span>생년월일 {formatDate(p.birth)}</span>
                <span>만 나이 {referenceLabel}</span>
                <span>
                  등록 {new Date(p.createdAt).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>
              {p.attachments.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5 sm:col-start-2">
                  {p.attachments.map((f, i) => {
                    const cat = categoryLabel(f.category);
                    const isImage = f.type.startsWith("image/");
                    const body = (
                      <>
                        <FileThumb blob={f.blob} name={f.name} className="size-7" />
                        <span className="text-muted">{cat}</span>
                        <span className="max-w-40 truncate">{f.name}</span>
                      </>
                    );
                    const chip =
                      "inline-flex max-w-full items-center gap-1.5 rounded-lg border border-line bg-bg py-0.5 pr-2 pl-0.5 text-xs";
                    return isImage ? (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setViewing({ blob: f.blob, caption: `${p.name} · ${cat} · ${f.name}` })}
                        className={`${chip} cursor-zoom-in`}
                      >
                        {body}
                      </button>
                    ) : (
                      <span key={i} className={chip}>
                        {body}
                      </span>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {viewing && <ImageViewer {...viewing} onClose={() => setViewing(null)} />}
    </section>
  );
}
