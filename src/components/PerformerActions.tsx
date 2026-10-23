"use client";

import Link from "next/link";
import { useLayoutEffect, useState } from "react";
import { deletePerformer } from "@/lib/store";

const button = "rounded-[7px] border border-line bg-surface px-2.5 py-1 text-[13px] font-semibold";

/** 목록 카드의 수정·삭제 버튼. 삭제는 한 번 더 확인한다. */
export function PerformerActions({
  performerId,
  name,
  onDeleted,
}: {
  performerId: string;
  name: string;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // 다른 화면에 다녀오면 삭제 확인은 닫혀 있게 한다.
  useLayoutEffect(() => () => setConfirming(false), []);

  async function remove() {
    setBusy(true);
    try {
      await deletePerformer(performerId);
      onDeleted();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  if (confirming) {
    return (
      <span role="group" aria-label={`${name} 삭제 확인`} className="ml-auto flex flex-wrap items-center gap-1.5">
        <span className="text-[13px] text-danger">
          {failed ? "삭제하지 못했습니다." : "메모와 첨부파일까지 모두 삭제할까요?"}
        </span>
        <button type="button" onClick={() => setConfirming(false)} className={button}>
          취소
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={remove}
          autoFocus
          className={`${button} border-danger bg-danger text-surface disabled:opacity-60`}
        >
          삭제
        </button>
      </span>
    );
  }

  return (
    <span className="ml-auto flex gap-1.5">
      <Link href={`/edit?id=${encodeURIComponent(performerId)}`} aria-label={`${name} 수정`} className={button}>
        수정
      </Link>
      <button
        type="button"
        aria-label={`${name} 삭제`}
        onClick={() => {
          setFailed(false);
          setConfirming(true);
        }}
        className={`${button} text-danger`}
      >
        삭제
      </button>
    </span>
  );
}
