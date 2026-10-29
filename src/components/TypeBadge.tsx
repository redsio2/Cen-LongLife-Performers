import { typeLabel, type Performer, type PerformerType } from "@/lib/performer";

const STYLES: Record<PerformerType, string> = {
  악화사례자: "bg-t-worse-bg text-t-worse",
  성공사례자: "bg-t-good-bg text-t-good",
  체험단: "bg-t-trial-bg text-t-trial",
  의사: "bg-t-doctor-bg text-t-doctor",
  지인: "bg-t-friend-bg text-t-friend",
  기타: "bg-t-etc-bg text-t-etc",
};

export function TypeBadge({
  performer,
}: {
  performer: Pick<Performer, "type" | "typeEtc" | "friendMemo">;
}) {
  const badge = (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STYLES[performer.type]}`}
    >
      {typeLabel(performer)}
    </span>
  );
  if (performer.type !== "지인" || !performer.friendMemo) return badge;
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
      {badge}
      <span className="min-w-0 truncate text-xs text-muted" title={performer.friendMemo}>
        {performer.friendMemo}
      </span>
    </span>
  );
}
