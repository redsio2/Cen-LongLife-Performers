"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDate, manAge } from "@/lib/date";
import { canEdit, useMember } from "@/lib/member";
import { ATTACHMENT_CATEGORIES, type Attachment, type Performer } from "@/lib/performer";
import { EMPTY_QUERY, filterPerformers, isEmptyQuery, type PerformerQuery } from "@/lib/search";
import { deletePerformer, listPerformers } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import { FileThumb, useFileUrl } from "./FileThumb";
import { ImageViewer } from "./ImageViewer";
import { PerformerForm } from "./PerformerForm";
import { SearchPanel } from "./SearchPanel";
import { TypeBadge } from "./TypeBadge";

type RefMode = "today" | "air" | "custom";

const categoryLabel = (key: Attachment["category"]) =>
  ATTACHMENT_CATEGORIES.find((c) => c.key === key)?.label ?? "";

export function PerformerList() {
  const [performers, setPerformers] = useState<Performer[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [refMode, setRefMode] = useState<RefMode>("today");
  const [refDate, setRefDate] = useState("");
  const [query, setQuery] = useState<PerformerQuery>(EMPTY_QUERY);
  const [viewing, setViewing] = useState<{ path: string; caption: string } | null>(null);
  /** 고치는 중인 출연자. 있으면 목록 대신 수정 폼을 보여 준다. */
  const [editing, setEditing] = useState<Performer | null>(null);
  /** 삭제를 한 번 더 확인하는 중인 출연자 id */
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const member = useMember();
  const memberId = member?.id;
  const editable = canEdit(member);

  // 로그인한 뒤에만 불러온다. 회원이 바뀌면 MemberGate가 이 화면을 새로 그린다.
  useEffect(() => {
    if (!memberId) return;
    listPerformers()
      .then(setPerformers)
      .catch(() => {
        setLoadError(true);
        setPerformers([]);
      });
  }, [memberId]);

  function startEdit(p: Performer) {
    setConfirmingDelete(null);
    setActionError("");
    setEditing(p);
    window.scrollTo({ top: 0 });
  }

  async function finishEdit() {
    const id = editing?.id;
    setEditing(null);
    try {
      setPerformers(await listPerformers());
    } catch {
      setActionError("수정한 내용을 다시 불러오지 못했습니다. 새로고침해 주세요.");
    }
    // 목록으로 돌아오면 방금 고친 출연자 카드로 스크롤한다.
    requestAnimationFrame(() =>
      document.getElementById(`performer-${id}`)?.scrollIntoView({ block: "center" }),
    );
  }

  async function remove(p: Performer) {
    try {
      await deletePerformer(p);
      setPerformers((prev) => prev?.filter((x) => x.id !== p.id) ?? null);
      setConfirmingDelete(null);
      setActionError("");
    } catch {
      setActionError(`${p.name} 출연자를 삭제하지 못했습니다. 다시 시도해 주세요.`);
    }
  }

  const today = useToday();
  const referenceFor = (p: Performer) =>
    refMode === "air" ? p.airDate : refMode === "custom" ? refDate || today : today;
  const referenceLabel =
    refMode === "air" ? "방송일 기준" : refMode === "custom" ? `${formatDate(refDate || today)} 기준` : "오늘 기준";

  const shown = performers ? filterPerformers(performers, query, referenceFor) : [];
  const total = performers?.length ?? 0;
  const searching = !isEmptyQuery(query);

  if (editing) {
    return (
      <section className="mt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">
            출연자 정보 수정 <span className="text-accent">· {editing.name}</span>
          </h2>
          <button
            type="button"
            onClick={finishEdit}
            className="text-sm font-semibold text-accent underline underline-offset-4"
          >
            목록으로 돌아가기
          </button>
        </div>
        <PerformerForm key={editing.id} performer={editing} onDone={finishEdit} />
      </section>
    );
  }

  return (
    <section>
      <SearchPanel query={query} onChange={setQuery}>
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
      </SearchPanel>

      <div className="mt-5 mb-3 font-semibold" aria-live="polite">
        {searching ? (
          <>
            검색 결과 <b className="font-mono text-accent">{shown.length}</b>명
            <span className="font-normal text-muted"> / 전체 {total}명</span> · 최신 등록순
          </>
        ) : (
          <>
            등록된 출연자 <b className="font-mono text-accent">{total}</b>명 · 최신 등록순
          </>
        )}
      </div>

      {actionError && (
        <p role="alert" className="mb-3 rounded-lg bg-accent-soft px-3 py-2.5 text-[13px] text-danger">
          {actionError}
        </p>
      )}

      {loadError && (
        <p className="mb-3 rounded-lg bg-accent-soft px-3 py-2.5 text-[13px] text-muted">
          출연자 목록을 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침해 주세요.
        </p>
      )}

      {performers && performers.length === 0 && !loadError && (
        <div className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-muted">
          <p>아직 등록된 출연자가 없습니다.</p>
          {editable && (
            <Link href="/new" className="mt-2 inline-block font-semibold text-accent underline underline-offset-4">
              첫 출연자 등록하기
            </Link>
          )}
        </div>
      )}

      {searching && total > 0 && shown.length === 0 && (
        <div className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-muted">
          <p>조건에 맞는 출연자가 없습니다.</p>
          <button
            type="button"
            onClick={() => setQuery(EMPTY_QUERY)}
            className="mt-2 font-semibold text-accent underline underline-offset-4"
          >
            조건 초기화
          </button>
        </div>
      )}

      <div className="grid gap-2.5">
        {shown.map((p) => {
          const age = manAge(p.birth, referenceFor(p));
          return (
            <article
              key={p.id}
              id={`performer-${p.id}`}
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
                {editable && (
                  <span className="ml-auto flex gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      aria-label={`${p.name} 수정`}
                      className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-accent"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(p.id)}
                      aria-label={`${p.name} 삭제`}
                      aria-expanded={confirmingDelete === p.id}
                      className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-danger"
                    >
                      삭제
                    </button>
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-wrap gap-x-3.5">
                {p.program && (
                  <span className="min-w-0 break-words">
                    <b className="mr-1.5 text-[13px] font-medium text-muted">프로그램</b>
                    {p.program}
                  </span>
                )}
                <span className="min-w-0 break-words">
                  <b className="mr-1.5 text-[13px] font-medium text-muted">아이템</b>
                  {p.item}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[13px] text-muted tabular-nums">
                <span>생년월일 {formatDate(p.birth)}</span>
                <span>만 나이 {referenceLabel}</span>
                <span>
                  등록 {new Date(p.createdAt).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })}
                </span>
                {p.updatedAt && (
                  <span>
                    수정{" "}
                    {new Date(p.updatedAt).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                )}
              </div>
              {(p.disease || p.fee) && (
                <div className="flex min-w-0 flex-wrap gap-x-3.5 text-sm sm:col-start-2">
                  {p.disease && (
                    <span className="min-w-0 break-words">
                      <b className="mr-1.5 text-[13px] font-medium text-muted">질병</b>
                      {p.disease}
                    </span>
                  )}
                  {p.fee && (
                    <span className="min-w-0 break-words">
                      <b className="mr-1.5 text-[13px] font-medium text-muted">출연료</b>
                      {p.fee}
                    </span>
                  )}
                </div>
              )}
              {p.memo && (
                <p className="mt-1 min-w-0 rounded-lg bg-bg px-2.5 py-1.5 text-[13px] break-words whitespace-pre-line sm:col-start-2">
                  <b className="mr-1.5 font-medium text-muted">메모</b>
                  {p.memo}
                </p>
              )}
              {p.attachments.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5 sm:col-start-2">
                  {p.attachments.map((f) => (
                    <AttachmentChip
                      key={f.id}
                      file={f}
                      onView={(caption) => setViewing({ path: f.path, caption: `${p.name} · ${caption}` })}
                    />
                  ))}
                </div>
              )}
              {confirmingDelete === p.id && (
                <div
                  role="alert"
                  className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-danger px-3 py-2 text-[13px] sm:col-span-2"
                >
                  <span className="min-w-0 flex-1">
                    <b>{p.name}</b> 출연자를 삭제할까요? 첨부파일도 함께 지워지고 되돌릴 수 없습니다.
                  </span>
                  <span className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(null)}
                      className="rounded-md border border-line bg-surface px-3 py-1 font-semibold"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(p)}
                      className="rounded-md border border-danger bg-danger px-3 py-1 font-semibold text-surface"
                    >
                      삭제
                    </button>
                  </span>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {viewing && (
        <ImageViewer source={{ path: viewing.path }} caption={viewing.caption} onClose={() => setViewing(null)} />
      )}
    </section>
  );
}

const chipClass =
  "inline-flex max-w-full items-center gap-1.5 rounded-lg border border-line bg-bg py-0.5 pr-2 pl-0.5 text-xs";

/** 첨부파일 하나. 이미지는 크게 보기, 그 밖의 파일은 새 탭에서 연다. */
function AttachmentChip({ file, onView }: { file: Attachment; onView: (caption: string) => void }) {
  const cat = categoryLabel(file.category);
  const isImage = file.type.startsWith("image/");
  // 이미지가 아니면 서명된 주소를 미리 받아 두어 링크로 연다.
  const url = useFileUrl(isImage ? null : { path: file.path });
  const body = (
    <>
      <FileThumb source={{ path: file.path }} name={file.name} type={file.type} className="size-7" />
      <span className="text-muted">{cat}</span>
      <span className="max-w-40 truncate">{file.name}</span>
    </>
  );
  if (isImage)
    return (
      <button type="button" onClick={() => onView(`${cat} · ${file.name}`)} className={`${chipClass} cursor-zoom-in`}>
        {body}
      </button>
    );
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`${chipClass} hover:border-accent`}>
      {body}
    </a>
  ) : (
    <span className={chipClass}>{body}</span>
  );
}
