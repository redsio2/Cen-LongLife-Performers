const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const pad = (n: number) => String(n).padStart(2, "0");

/** 브라우저 현지 날짜를 YYYY-MM-DD로 */
export function todayString(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function parse(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return { y, m, d };
}

/**
 * 만 나이: 기준일의 연도 - 출생 연도에서, 기준일이 그해 생일 전이면 1을 뺀다.
 * 2월 29일생은 평년에 3월 1일부터 한 살 더 먹는다.
 */
export function manAge(birth: string, reference: string): number | null {
  if (!birth || !reference) return null;
  const b = parse(birth);
  const r = parse(reference);
  let age = r.y - b.y;
  if (r.m < b.m || (r.m === b.m && r.d < b.d)) age -= 1;
  return age;
}

/** 2026. 11. 4. (수) */
export function formatDate(s: string): string {
  if (!s) return "";
  const { y, m, d } = parse(s);
  return `${y}. ${m}. ${d}. (${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`;
}

export function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))}KB`
    : `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
