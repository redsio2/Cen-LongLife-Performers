"use client";

import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from "react";
import { MAX_NOTE_LENGTH, type PerformerNote } from "@/lib/performer";
import { addNote, listNotes } from "@/lib/store";

const smallButton = "rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-semibold";

const formatTime = (ms: number) =>
  new Date(ms).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });

/** 카드가 잠시 사라져도(수정 화면, 검색) 남겨 두는 펼침 상태와 쓰던 메모 */
export type NoteDraft = { open: boolean; text: string; id: string | null };

/** 불러온 목록에 이 화면에서 방금 남긴 메모를 더한다. 늦게 온 예전 목록이 새 메모를 지우지 않게 한다. */
function merge(notes: PerformerNote[], added: PerformerNote[]): PerformerNote[] {
  const ids = new Set(notes.map((n) => n.id));
  return [...added.filter((n) => !ids.has(n.id)), ...notes].sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * 출연자 한 명의 메모 기록. 펼칠 때 그 출연자의 메모만 최신순으로 불러오고,
 * 편집 가능 회원은 새 메모를 남길 수 있다.
 */
export function PerformerNotes({
  performerId,
  count,
  editable,
  onCountChange,
  draft,
  onDraftChange,
}: {
  performerId: string;
  count: number;
  editable: boolean;
  onCountChange: (count: number) => void;
  draft: NoteDraft | undefined;
  onDraftChange: (draft: NoteDraft) => void;
}) {
  const [open, setOpen] = useState(draft?.open ?? false);
  const [notes, setNotes] = useState<PerformerNote[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [text, setText] = useState(draft?.text ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // 화면이 다시 그려지기 전 두 번째 클릭도 막는다.
  const savingRef = useRef(false);
  // 지금 초안의 id. 저장에 성공할 때까지 내용을 고쳐도 같은 id라, 응답만 못 받은 제출을
  // 다시 보내도 서버에 한 번만 저장된다.
  const draftId = useRef<string | null>(draft?.id ?? null);
  // 이 화면에서 남긴 메모. 불러온 목록에 늘 더한다.
  const added = useRef<PerformerNote[]>([]);

  function saveDraft(next: Partial<NoteDraft>) {
    onDraftChange({ open, text, id: draftId.current, ...next });
  }

  const syncCount = useEffectEvent(onCountChange);
  useEffect(() => {
    if (notes) syncCount(notes.length);
  }, [notes]);

  useEffect(() => {
    if (!open) return;
    let current = true;
    listNotes(performerId)
      .then((fetched) => {
        if (!current) return;
        setLoadError(false);
        setNotes(merge(fetched, added.current));
      })
      .catch(() => {
        if (current) setLoadError(true);
      });
    return () => {
      current = false;
    };
  }, [open, performerId]);

  function toggle(next: boolean) {
    setOpen(next);
    saveDraft({ open: next });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return setError("메모 내용을 입력해 주세요.");
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    draftId.current ??= crypto.randomUUID();
    saveDraft({});
    try {
      const note = await addNote(performerId, draftId.current, body);
      draftId.current = null;
      added.current.push(note);
      setNotes((prev) => prev && merge(prev, [note]));
      if (note.body === body) {
        setText("");
        saveDraft({ text: "", id: null });
      } else {
        // 응답을 못 받았던 앞선 제출이 사실은 저장되어 있었다. 고친 내용은 그대로 둔다.
        setError("앞서 보낸 메모가 이미 저장되어 있었습니다. 고친 내용을 남기려면 다시 눌러 주세요.");
        saveDraft({ id: null });
      }
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
          onClick={() => toggle(true)}
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
        <button type="button" onClick={() => toggle(false)} aria-expanded className={smallButton}>
          접기
        </button>
      </div>

      {editable && (
        <form noValidate onSubmit={onSubmit} className="grid gap-1.5">
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              saveDraft({ text: e.target.value });
              if (error) setError("");
            }}
            rows={2}
            readOnly={saving}
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
