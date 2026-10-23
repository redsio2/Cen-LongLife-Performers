"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/date";
import type { Memo } from "@/lib/performer";
import { listMemos } from "@/lib/store";

const PREVIEW = 2;

/** 목록 카드 아래에 보이는 출연자 메모. 최신 2개를 먼저 보여 준다. */
export function PerformerMemos({ performerId }: { performerId: string }) {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    listMemos(performerId).then(setMemos, () => setMemos([]));
  }, [performerId]);

  if (memos.length === 0) return null;
  const shown = open ? memos : memos.slice(0, PREVIEW);
  return (
    <div className="mt-1.5 grid min-w-0 gap-1.5 sm:col-start-2">
      <div className="text-[13px] font-medium text-muted">메모 {memos.length}개</div>
      <ul className="grid gap-1.5">
        {shown.map((m) => (
          <li key={m.id} className="min-w-0 rounded-lg bg-bg px-3 py-2 text-[13px]">
            <p className="break-words whitespace-pre-wrap">{m.body}</p>
            <p className="mt-0.5 text-xs text-muted tabular-nums">
              {formatDateTime(m.updatedAt ?? m.createdAt)}
              {m.updatedAt && " 수정"}
            </p>
          </li>
        ))}
      </ul>
      {memos.length > PREVIEW && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="justify-self-start text-[13px] font-semibold text-accent"
        >
          {open ? "접기" : `메모 ${memos.length - PREVIEW}개 더 보기`}
        </button>
      )}
    </div>
  );
}
