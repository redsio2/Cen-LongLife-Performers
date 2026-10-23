"use client";

import { useSyncExternalStore } from "react";
import { todayString } from "./date";

const subscribe = () => () => {};

/**
 * 브라우저 현지 기준 오늘(YYYY-MM-DD). 서버 렌더링 중에는 빈 문자열이다.
 * 서버(UTC)와 브라우저(KST)의 날짜가 다를 수 있어 오늘 날짜는 브라우저에서만 정한다.
 */
export function useToday(): string {
  return useSyncExternalStore(subscribe, todayString, () => "");
}
