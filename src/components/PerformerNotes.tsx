"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MAX_NOTE_LENGTH, type PerformerNote } from "@/lib/performer";
import { addNote, listNotes } from "@/lib/store";

const smallButton = "rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-semibold";

const formatTime = (ms: number) =>
  new Date(ms).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });

/**
 * 출연자 한 명의 메모 기록. 펼칠 때 그 출연자의 메모만 최신순으로 불러오고,
 * 편집 가능 회원은 새 메모를 남길 수 있다.
 */
export function PerformerNotes({
  performerId,
  count,
  editable,
  onCountChange,
}: {
  performerId: string;
  count: number;
  editable: boolean;
  onCountChange: (count: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<PerformerNote[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // 화면이 다시 그려지기 전 두 번째 클릭도 막는다.
  const savingRef = useRef(false);
  // 지금 초안의 id. 실패 후 다시 보내도 같은 id라 서버에 한 번만 저장된다.
  const draftId = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    listNotes(performerId)
      .then(setNotes)
      .catch(() => setLoadError(true));
  }, [open, performerId]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return setError("메모 내용을 입력해 주세요.");
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    draftId.current ??= crypto.randomUUID();
    try {
      await addNote(performerId, draftId.current, body);
      draftId.current = null;
      setText("");
      const fresh = await listNotes(performerId);
      setNotes(fresh);
      onCountChange(fresh.length);
    } catch {
      setError("메모를 저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (!editable && count === 0) return null;

  if (!open)
    return (
      <div className="mt-1.5 sm:col-start-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          className={`${smallButton} text-accent`}
        >
          {count > 0 ? `메모 기록 ${count}개` : "메모 남기기"}
        </button>
      </div>
    );

  const blank = !text.trim();
  return (
    <section
      aria-label="메모 기록"
      className="mt-2 grid min-w-0 gap-2 rounded-lg border border-line bg-bg p-2.5 text-[13px] sm:col-start-2"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">
          메모 기록 <span className="font-mono text-accent">{notes ? notes.length : count}</span>개 · 최신순
        </h3>
        <button type="button" onClick={() => setOpen(false)} aria-expanded className={smallButton}>
          접기
        </button>
      </div>

      {editable && (
        <form noValidate onSubmit={onSubmit} className="grid gap-1.5">
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              // 내용이 바뀌면 새 초안이다. 이전 실패한 제출과 같은 id를 쓰지 않는다.
              draftId.current = null;
              if (error) setError("");
            }}
            rows={2}
            maxLength={MAX_NOTE_LENGTH}
            aria-label="새 메모"
            aria-invalid={!!error}
            placeholder="예: 11/3 통화, 촬영일 조율 중"
            className="w-full resize-y rounded-lg border border-line bg-surface px-3 py-2 text-ink aria-invalid:border-danger"
          />
          <div className="flex items-center justify-end gap-2">
            {error && (
              <p role="alert" className="mr-auto text-xs text-danger">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={blank || saving}
              className="rounded-md border border-accent bg-accent px-3 py-1 text-xs font-semibold text-accent-ink disabled:opacity-40"
            >
              {saving ? "저장하는 중…" : "메모 남기기"}
            </button>
          </div>
        </form>
      )}

      {loadError ? (
        <p className="text-xs text-danger">메모를 불러오지 못했습니다. 새로고침해 주세요.</p>
      ) : !notes ? (
        <p className="text-xs text-muted">불러오는 중…</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-muted">아직 남긴 메모가 없습니다.</p>
      ) : (
        <ol className="grid gap-1.5">
          {notes.map((n) => (
            <li key={n.id} className="rounded-md border border-line bg-surface px-2.5 py-1.5">
              <p className="break-words whitespace-pre-line">{n.body}</p>
              <time dateTime={new Date(n.createdAt).toISOString()} className="mt-0.5 block text-[11px] text-muted tabular-nums">
                {formatTime(n.createdAt)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
