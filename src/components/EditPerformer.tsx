"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { now } from "@/lib/ids";
import type { Memo, Performer } from "@/lib/performer";
import { getPerformer, listMemos } from "@/lib/store";
import { PerformerForm } from "./PerformerForm";

type State =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ready"; performer: Performer; memos: Memo[]; loadedAt: number };

export function EditPerformer() {
  const id = useSearchParams().get("id") ?? "";
  const [state, setState] = useState<State>({ status: "loading" });

  // 이 화면은 다른 화면으로 가도 숨겨진 채 남는다. 다시 보일 때마다 저장된 내용을 새로 읽고,
  // 읽을 때마다 폼을 새로 만들어 예전에 입력하던 상태가 남지 않게 한다.
  useEffect(() => {
    if (!id) return;
    Promise.all([getPerformer(id), listMemos(id)])
      .then(([performer, memos]) =>
        setState(performer ? { status: "ready", performer, memos, loadedAt: now() } : { status: "missing" }),
      )
      .catch(() => setState({ status: "missing" }));
  }, [id]);

  if (id && state.status === "loading") return <p className="mt-5 text-muted">불러오는 중…</p>;
  if (state.status !== "ready")
    return (
      <div className="mt-5 rounded-xl border border-dashed border-line px-4 py-10 text-center text-muted">
        <p>이 브라우저에 저장된 출연자 중에서 찾지 못했습니다. 이미 삭제됐을 수 있습니다.</p>
        <Link href="/" className="mt-2 inline-block font-semibold text-accent underline underline-offset-4">
          출연자 목록으로
        </Link>
      </div>
    );
  return (
    <>
      <h2 className="mt-5 text-lg font-bold">{state.performer.name} 님 정보 수정</h2>
      <PerformerForm key={`${state.performer.id}-${state.loadedAt}`} initial={state} />
    </>
  );
}
