"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/date";
import type { Memo } from "@/lib/performer";

const textareaClass = "w-full resize-y rounded-lg border border-line bg-bg px-3 py-2.5 text-ink";
const smallButton = "rounded-[7px] border border-line bg-surface px-2.5 py-1 text-[13px] font-semibold";

/** 등록·수정 폼의 메모 영역. 저장은 폼을 제출할 때 함께 한다. */
export function MemoEditor({
  memos,
  draft,
  onDraftChange,
  onAdd,
  onEdit,
  onDelete,
}: {
  memos: Memo[];
  draft: string;
  onDraftChange: (v: string) => void;
  onAdd: () => void;
  onEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <label htmlFor="memo-draft" className="text-sm font-semibold">
          새 메모
        </label>
        <textarea
          id="memo-draft"
          rows={3}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder="섭외 통화 내용, 촬영 시 주의할 점 등을 남겨 주세요. 메모는 여러 개 남길 수 있습니다."
          className={textareaClass}
        />
        <button
          type="button"
          disabled={!draft.trim()}
          onClick={onAdd}
          className={`${smallButton} justify-self-end text-accent disabled:opacity-40`}
        >
          메모 추가
        </button>
      </div>

      {memos.length > 0 && (
        <ul className="grid gap-2" aria-label="메모 목록">
          {memos.map((m) => (
            <MemoRow key={m.id} memo={m} onEdit={(body) => onEdit(m.id, body)} onDelete={() => onDelete(m.id)} />
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">메모는 아래 버튼으로 출연자를 저장할 때 함께 저장됩니다.</p>
    </div>
  );
}

function MemoRow({ memo, onEdit, onDelete }: { memo: Memo; onEdit: (body: string) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <li className="grid min-w-0 gap-1.5 rounded-lg border border-line bg-bg px-3 py-2.5">
      {editing == null ? (
        <p className="break-words whitespace-pre-wrap">{memo.body}</p>
      ) : (
        <textarea
          rows={3}
          aria-label="메모 수정"
          value={editing}
          onChange={(e) => setEditing(e.target.value)}
          autoFocus
          className={textareaClass}
        />
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted tabular-nums">
        <span>
          {formatDateTime(memo.createdAt)}
          {memo.updatedAt && ` · ${formatDateTime(memo.updatedAt)} 수정`}
        </span>
        <span className="ml-auto flex gap-1.5">
          {editing == null ? (
            <>
              <button type="button" onClick={() => setEditing(memo.body)} className={smallButton}>
                수정
              </button>
              <button type="button" onClick={onDelete} className={`${smallButton} text-danger`}>
                삭제
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setEditing(null)} className={smallButton}>
                취소
              </button>
              <button
                type="button"
                disabled={!editing.trim()}
                onClick={() => {
                  if (editing.trim() !== memo.body) onEdit(editing.trim());
                  setEditing(null);
                }}
                className={`${smallButton} text-accent disabled:opacity-40`}
              >
                완료
              </button>
            </>
          )}
        </span>
      </div>
    </li>
  );
}
