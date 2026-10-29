"use client";

import { useSyncExternalStore } from "react";

/**
 * 출연자 관리 화면에 들어올 수 있는 회원 등록번호. 회원을 늘리거나 빼려면 이 목록을 고친다.
 * 백엔드가 생기기 전까지 이 목록은 브라우저로 그대로 내려가므로, 화면 접근을 막을 뿐 보안 장치는 아니다.
 */
export const MEMBER_NUMBERS = ["CEN-0001", "CEN-0002", "CEN-0003"];

const KEY = "cen-member";
const EVENT = "cen-member-change";

/** 대소문자·공백·하이픈을 무시하고 비교한다. (cen 0001 → CEN0001) */
const normalize = (s: string) => s.toUpperCase().replace(/[\s-]/g, "");

/** 목록에 있는 등록번호면 목록에 적힌 그대로 돌려준다. */
export function findMember(input: string): string | null {
  const n = normalize(input);
  return n ? (MEMBER_NUMBERS.find((m) => normalize(m) === n) ?? null) : null;
}

/** 저장소가 막힌 창(사생활 보호 모드 등)에서는 이 탭에서만 기억한다. */
let memory: string | null = null;

function read(): string | null {
  try {
    // 목록에서 빠진 번호로 들어와 있던 브라우저도 다시 막는다.
    return findMember(localStorage.getItem(KEY) ?? "");
  } catch {
    return memory;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

/**
 * 들어와 있는 회원의 등록번호. 없으면 null, 서버 렌더링 중에는 아직 모르므로 undefined.
 */
export function useMember(): string | null | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}

/** 등록번호가 목록에 있으면 들어오고 true, 없으면 false. */
export function signIn(input: string): boolean {
  const member = findMember(input);
  if (!member) return false;
  memory = member;
  try {
    localStorage.setItem(KEY, member);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
  return true;
}

export function signOut() {
  memory = null;
  try {
    localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}
