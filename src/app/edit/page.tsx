import type { Metadata } from "next";
import { Suspense } from "react";
import { EditPerformer } from "@/components/EditPerformer";

export const metadata: Metadata = {
  title: "출연자 수정 · 인생의 연장전",
};

// 출연자는 브라우저에만 저장되어 서버가 id를 알 수 없으므로 /edit?id=… 로 받는다.
export default function EditPerformerPage() {
  return (
    <Suspense fallback={<p className="mt-5 text-muted">불러오는 중…</p>}>
      <EditPerformer />
    </Suspense>
  );
}
