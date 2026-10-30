"use client";

import { FunctionsHttpError, type AuthError } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";

/**
 * 회원은 관리자가 발급한 등록번호(CEN-0001~CEN-9999)와 비밀번호로 로그인한다.
 * 등록번호마다 Supabase Auth 계정이 하나 있고, 이메일 칸에는 아래 형식의 로그인용 주소가 들어간다(메일은 보내지 않는다).
 * 회원 추가·권한 변경은 관리자 Edge Function(supabase/functions/admin-members)이 한다.
 */
const MEMBER_EMAIL_DOMAIN = "cenlonglifeperformers.vercel.app";
export const FIRST_ADMIN = "CEN-0001";
export const MIN_PASSWORD = 8;

export const ROLES = ["viewer", "editor", "admin"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = { viewer: "보기 전용", editor: "편집 가능", admin: "관리자" };

export type Member = { id: string; number: string; name: string; role: Role };

/** "cen 12", "CEN0012" 같은 입력도 CEN-0012로 맞춘다. 형식이 틀리면 null. */
export function normalizeNumber(input: string): string | null {
  const digits = input.toUpperCase().replace(/^\s*CEN/, "").replace(/[\s-]/g, "");
  if (!/^\d{1,4}$/.test(digits)) return null;
  const n = `CEN-${digits.padStart(4, "0")}`;
  return n === "CEN-0000" ? null : n;
}

const emailOf = (number: string) => `${number.toLowerCase()}@${MEMBER_EMAIL_DOMAIN}`;

export const canEdit = (m: Member | null | undefined) => m?.role === "editor" || m?.role === "admin";

// 로그인한 회원 상태. 아직 확인 전이면 undefined, 로그인하지 않았으면 null.
let current: Member | null | undefined = undefined;
const listeners = new Set<() => void>();
let started = false;

function setCurrent(next: Member | null) {
  if (JSON.stringify(next) === JSON.stringify(current)) return;
  current = next;
  listeners.forEach((l) => l());
}

async function refresh() {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return setCurrent(null);
  const { data: row } = await supabase
    .from("members")
    .select("id, number, name, role, active")
    .eq("id", user.id)
    .maybeSingle();
  // 차단된 회원은 로그인되어 있어도 들여보내지 않는다(데이터는 RLS가 막는다).
  setCurrent(row?.active ? { id: row.id, number: row.number, name: row.name, role: row.role } : null);
}

function subscribe(onChange: () => void) {
  if (!started) {
    started = true;
    void refresh();
    supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION") return;
      // 이 콜백 안에서 바로 Supabase를 부르면 멈출 수 있어 한 박자 늦춘다.
      setTimeout(() => void refresh(), 0);
    });
  }
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** 로그인한 회원. 확인 중이면 undefined, 로그인하지 않았으면 null. */
export function useMember(): Member | null | undefined {
  return useSyncExternalStore(subscribe, () => current, () => undefined);
}

function authMessage(error: AuthError): string {
  if (error.status === 429 || error.code === "over_request_rate_limit")
    return "시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  if (error.code === "user_banned") return "사용이 중지된 등록번호입니다. 관리자에게 문의해 주세요.";
  if (error.code === "invalid_credentials") return "등록번호 또는 비밀번호가 맞지 않습니다.";
  if (error.code === "same_password") return "지금 쓰는 비밀번호와 다른 비밀번호를 입력해 주세요.";
  if (error.code === "weak_password") return `비밀번호는 ${MIN_PASSWORD}자 이상으로 더 복잡하게 정해 주세요.`;
  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

/** 로그인. 성공하면 null, 실패하면 화면에 보여 줄 문구. */
export async function signIn(numberInput: string, password: string): Promise<string | null> {
  const number = normalizeNumber(numberInput);
  if (!number) return "등록번호를 CEN-0001 형식으로 입력해 주세요.";
  if (!password) return "비밀번호를 입력해 주세요.";
  const { data, error } = await supabase.auth.signInWithPassword({ email: emailOf(number), password });
  if (error) return authMessage(error);
  const { data: row } = await supabase.from("members").select("active").eq("id", data.user.id).maybeSingle();
  if (!row?.active) {
    await supabase.auth.signOut();
    return "사용할 수 없는 등록번호입니다. 관리자에게 문의해 주세요.";
  }
  await refresh();
  return null;
}

export async function signOut() {
  await supabase.auth.signOut();
  setCurrent(null);
}

/** 회원이 한 명도 없어 첫 관리자(CEN-0001)를 설정해야 하는지 */
export async function needsFirstAdmin(): Promise<boolean> {
  const { data } = await supabase.rpc("needs_first_admin");
  return data === true;
}

/** 관리자 Edge Function 호출. 실패하면 화면에 보여 줄 문구를 담아 throw한다. */
export async function callAdmin<T = { ok: true }>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-members", { body });
  if (error) {
    let message = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    if (error instanceof FunctionsHttpError) {
      try {
        message = (await error.context.json()).error ?? message;
      } catch {}
    }
    throw new Error(message);
  }
  return data as T;
}

/** 첫 관리자 CEN-0001을 만들고 바로 로그인한다. 성공하면 null, 실패하면 문구. */
export async function setUpFirstAdmin(name: string, password: string): Promise<string | null> {
  try {
    await callAdmin({ action: "bootstrap", name, password });
  } catch (e) {
    return (e as Error).message;
  }
  return signIn(FIRST_ADMIN, password);
}

/** 내 비밀번호 바꾸기. 성공하면 null, 실패하면 문구. */
export async function changePassword(password: string): Promise<string | null> {
  if (password.length < MIN_PASSWORD) return `비밀번호는 ${MIN_PASSWORD}자 이상이어야 합니다.`;
  const { error } = await supabase.auth.updateUser({ password });
  return error ? authMessage(error) : null;
}
