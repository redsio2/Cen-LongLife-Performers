import { manAge } from "./date";
import { typeLabel, type Performer, type PerformerType } from "./performer";

export type PerformerQuery = {
  /** 이름·프로그램·아이템·유형·회차·질병·메모·연락처에서 찾는 검색어 */
  keyword: string;
  /** 비어 있으면 모든 유형 */
  types: PerformerType[];
  episodeFrom: string;
  episodeTo: string;
  /** YYYY-MM-DD */
  airFrom: string;
  airTo: string;
  ageFrom: string;
  ageTo: string;
};

export const EMPTY_QUERY: PerformerQuery = {
  keyword: "",
  types: [],
  episodeFrom: "",
  episodeTo: "",
  airFrom: "",
  airTo: "",
  ageFrom: "",
  ageTo: "",
};

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, "");

const toNumber = (s: string) => (s.trim() === "" ? null : Number(s));

function inRange(value: number | null, from: string, to: string): boolean {
  const lo = toNumber(from);
  const hi = toNumber(to);
  if (lo == null && hi == null) return true;
  if (value == null) return false;
  return (lo == null || value >= lo) && (hi == null || value <= hi);
}

/**
 * 검색어 하나하나가 이름·프로그램·아이템·유형·"N회"·질병·메모·연락처 중 어딘가에 들어 있어야 한다.
 * 연락처는 하이픈 없이 숫자만으로도 찾는다 (예: 01012345678, 5678).
 */
function matchesKeyword(p: Performer, keyword: string): boolean {
  const words = keyword.trim().split(/\s+/).filter(Boolean).map(normalize);
  if (words.length === 0) return true;
  const haystack = normalize(
    `${p.name} ${p.program} ${p.item} ${typeLabel(p)} ${p.episode}회 ${p.disease} ${p.memo} ${p.contact} ${p.contact.replace(/\D/g, "")}`,
  );
  return words.every((w) => haystack.includes(w));
}

/**
 * 조건에 맞는 출연자만 남긴다. 만 나이는 출연자마다 reference(p)로 정한 기준일에서 계산한다.
 */
export function filterPerformers(
  performers: Performer[],
  q: PerformerQuery,
  reference: (p: Performer) => string,
): Performer[] {
  return performers.filter(
    (p) =>
      matchesKeyword(p, q.keyword) &&
      (q.types.length === 0 || q.types.includes(p.type)) &&
      inRange(p.episode, q.episodeFrom, q.episodeTo) &&
      (!q.airFrom || p.airDate >= q.airFrom) &&
      (!q.airTo || p.airDate <= q.airTo) &&
      inRange(manAge(p.birth, reference(p)), q.ageFrom, q.ageTo),
  );
}

export function isEmptyQuery(q: PerformerQuery): boolean {
  return (
    !q.keyword.trim() &&
    q.types.length === 0 &&
    !q.episodeFrom &&
    !q.episodeTo &&
    !q.airFrom &&
    !q.airTo &&
    !q.ageFrom &&
    !q.ageTo
  );
}
