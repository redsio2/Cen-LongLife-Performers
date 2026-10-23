import { typeLabel, type Performer, type PerformerType } from "@/lib/performer";

const STYLES: Record<PerformerType, string> = {
  악화사례자: "bg-t-worse-bg text-t-worse",
  성공사례자: "bg-t-good-bg text-t-good",
  체험단: "bg-t-trial-bg text-t-trial",
  지인: "bg-t-friend-bg text-t-friend",
  기타: "bg-t-etc-bg text-t-etc",
};

export function TypeBadge({ performer }: { performer: Pick<Performer, "type" | "typeEtc"> }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STYLES[performer.type]}`}
    >
      {typeLabel(performer)}
    </span>
  );
}
