import { manAge } from "./date";
import { typeLabel, type Performer, type PerformerType } from "./performer";

export type PerformerQuery = {
  /** 이름·아이템·유형·지인 메모·회차에서 찾는 검색어 */
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

/** 빈 칸은 null, 0 이상의 정수가 아니면 NaN */
function parseBound(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  return /^\d+$/.test(t) ? Number(t) : NaN;
}

type Bounds = { lo: number | null; hi: number | null };

/** 잘못 적은 값은 조건에서 빼고 queryProblems()로 알린다. */
function bounds(from: string, to: string): Bounds {
  const lo = parseBound(from);
  const hi = parseBound(to);
  return { lo: Number.isNaN(lo) ? null : lo, hi: Number.isNaN(hi) ? null : hi };
}

function inRange(value: number | null, { lo, hi }: Bounds): boolean {
  if (lo == null && hi == null) return true;
  if (value == null) return false;
  return (lo == null || value >= lo) && (hi == null || value <= hi);
}

/**
 * 검색어 한 단어. "12회"처럼 회차를 적으면 그 회차만 맞는다.
 * 숫자만 적으면 회차가 같거나 글자 칸에 그 숫자가 들어 있으면 맞는다.
 */
type Word = { text: string; episode: number | null; episodeOnly: boolean };

function parseWords(keyword: string): Word[] {
  return keyword
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const m = /^(\d+)(회)?$/.exec(w);
      return { text: normalize(w), episode: m ? Number(m[1]) : null, episodeOnly: Boolean(m?.[2]) };
    });
}

/** 칸마다 따로 비교해, 이름 끝과 아이템 앞이 이어져 엉뚱하게 맞는 일이 없게 한다. */
function matchesWord(p: Performer, fields: string[], w: Word): boolean {
  if (w.episode != null && p.episode === w.episode) return true;
  if (w.episodeOnly) return false;
  return fields.some((f) => f.includes(w.text));
}

function searchFields(p: Performer): string[] {
  return [p.name, p.item, typeLabel(p), p.friendMemo ?? ""].map(normalize);
}

/**
 * 조건에 맞는 출연자만 남긴다. 만 나이는 출연자마다 reference(p)로 정한 기준일에서 계산하고,
 * 목록에 "만 나이 -"로 보이는 출연자(기준일이 생일보다 앞)는 나이 조건에 맞지 않는 것으로 본다.
 */
export function filterPerformers(
  performers: Performer[],
  q: PerformerQuery,
  reference: (p: Performer) => string,
): Performer[] {
  const words = parseWords(q.keyword);
  const episode = bounds(q.episodeFrom, q.episodeTo);
  const age = bounds(q.ageFrom, q.ageTo);
  const ageSet = age.lo != null || age.hi != null;

  return performers.filter((p) => {
    if (q.types.length > 0 && !q.types.includes(p.type)) return false;
    if (!inRange(p.episode, episode)) return false;
    if (q.airFrom && p.airDate < q.airFrom) return false;
    if (q.airTo && p.airDate > q.airTo) return false;
    if (ageSet) {
      const a = manAge(p.birth, reference(p));
      if (a == null || a < 0 || !inRange(a, age)) return false;
    }
    if (words.length === 0) return true;
    const fields = searchFields(p);
    return words.every((w) => matchesWord(p, fields, w));
  });
}

/** 범위 칸에 잘못 적은 값이나 앞뒤가 바뀐 범위를 사람이 읽을 문장으로 */
export function queryProblems(q: PerformerQuery): string[] {
  const problems: string[] = [];
  const numberRange = (label: string, unit: string, from: string, to: string) => {
    const lo = parseBound(from);
    const hi = parseBound(to);
    if (Number.isNaN(lo) || Number.isNaN(hi))
      problems.push(`${label}는 0 이상의 정수로 적어 주세요. 잘못 적은 칸은 검색에서 뺐습니다.`);
    else if (lo != null && hi != null && lo > hi)
      problems.push(`${label} 범위가 거꾸로입니다 (${lo}${unit} ~ ${hi}${unit}).`);
  };
  numberRange("회차", "회", q.episodeFrom, q.episodeTo);
  if (q.airFrom && q.airTo && q.airFrom > q.airTo) problems.push("방송일 시작이 끝보다 늦습니다.");
  numberRange("만 나이", "세", q.ageFrom, q.ageTo);
  return problems;
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
