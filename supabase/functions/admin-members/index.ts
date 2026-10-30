// 회원(등록번호) 관리. secret key가 필요한 일이라 브라우저 대신 여기서 한다.
// verify_jwt = false로 배포하고, 호출한 사람이 관리자인지는 아래에서 직접 확인한다.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const MEMBER_EMAIL_DOMAIN = "cenlonglifeperformers.vercel.app";
const NUMBER_RE = /^CEN-\d{4}$/;
const ROLES = ["viewer", "editor", "admin"] as const;
type Role = (typeof ROLES)[number];
const MIN_PASSWORD = 8;
const FIRST_ADMIN = "CEN-0001";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const fail = (message: string, status = 400) => json({ error: message }, status);

/** "cen 12" 같은 입력도 CEN-0012로 맞춘다. */
function normalizeNumber(input: unknown): string | null {
  const digits = String(input ?? "").toUpperCase().replace(/^CEN/, "").replace(/[\s-]/g, "");
  if (!/^\d{1,4}$/.test(digits)) return null;
  const n = `CEN-${digits.padStart(4, "0")}`;
  return NUMBER_RE.test(n) && n !== "CEN-0000" ? n : null;
}

const emailOf = (number: string) => `${number.toLowerCase()}@${MEMBER_EMAIL_DOMAIN}`;

function checkPassword(p: unknown): string | null {
  return typeof p === "string" && p.length >= MIN_PASSWORD ? null : `비밀번호는 ${MIN_PASSWORD}자 이상이어야 합니다.`;
}

function adminClient(): SupabaseClient {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  const key = keys ? JSON.parse(keys)["default"] : Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(Deno.env.get("SUPABASE_URL")!, key, { auth: { persistSession: false } });
}

/** 호출한 사람이 활동 중인 관리자면 그 id를, 아니면 null을 돌려준다. */
async function callerAdminId(db: SupabaseClient, req: Request): Promise<string | null> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await db.auth.getUser(token);
  if (!data.user) return null;
  const { data: me } = await db.from("members").select("role, active").eq("id", data.user.id).maybeSingle();
  return me?.role === "admin" && me.active ? data.user.id : null;
}

async function createMember(db: SupabaseClient, number: string, name: string, role: Role, password: string) {
  const { data, error } = await db.auth.admin.createUser({
    email: emailOf(number),
    password,
    email_confirm: true,
    app_metadata: { number },
  });
  if (error || !data.user) return fail(`회원을 만들지 못했습니다: ${error?.message ?? "알 수 없는 오류"}`);
  const { error: insertError } = await db.from("members").insert({ id: data.user.id, number, name, role });
  if (insertError) {
    await db.auth.admin.deleteUser(data.user.id);
    return fail(`회원을 만들지 못했습니다: ${insertError.message}`);
  }
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail("POST만 받습니다.", 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("요청 형식이 잘못되었습니다.");
  }
  const db = adminClient();

  // 회원이 한 명도 없을 때 한 번만: CEN-0001 관리자를 만든다. 비밀번호는 설정하는 사람이 직접 정한다.
  if (body.action === "bootstrap") {
    const { count } = await db.from("members").select("id", { count: "exact", head: true });
    if (count !== 0) return fail("이미 관리자가 있습니다. 관리자에게 등록번호를 요청해 주세요.", 403);
    const bad = checkPassword(body.password);
    if (bad) return fail(bad);
    return createMember(db, FIRST_ADMIN, String(body.name ?? "").trim(), "admin", body.password as string);
  }

  const adminId = await callerAdminId(db, req);
  if (!adminId) return fail("관리자만 할 수 있습니다.", 403);

  switch (body.action) {
    case "list": {
      const { data, error } = await db
        .from("members")
        .select("id, number, name, role, active, created_at")
        .order("number");
      return error ? fail(error.message, 500) : json({ members: data });
    }

    case "create": {
      const number = normalizeNumber(body.number);
      if (!number) return fail("등록번호는 CEN-0001부터 CEN-9999 사이로 적어 주세요.");
      const role = body.role as Role;
      if (!ROLES.includes(role)) return fail("권한을 골라 주세요.");
      const bad = checkPassword(body.password);
      if (bad) return fail(bad);
      const { data: taken } = await db.from("members").select("id").eq("number", number).maybeSingle();
      if (taken) return fail(`${number}는 이미 발급된 번호입니다.`);
      return createMember(db, number, String(body.name ?? "").trim(), role, body.password as string);
    }

    case "update": {
      const id = String(body.id ?? "");
      const { data: target } = await db.from("members").select("id").eq("id", id).maybeSingle();
      if (!target) return fail("회원을 찾지 못했습니다.", 404);
      const self = id === adminId;
      const patch: Record<string, unknown> = {};

      if (typeof body.name === "string") patch.name = body.name.trim();
      if (body.role !== undefined) {
        if (!ROLES.includes(body.role as Role)) return fail("권한을 골라 주세요.");
        if (self && body.role !== "admin") return fail("자기 자신의 관리자 권한은 뺄 수 없습니다.");
        patch.role = body.role;
      }
      if (body.active !== undefined) {
        if (self && body.active === false) return fail("자기 자신은 차단할 수 없습니다.");
        patch.active = !!body.active;
        // 차단하면 로그인과 토큰 갱신도 막는다. 이미 받은 토큰은 RLS가 active를 보고 막는다.
        const { error } = await db.auth.admin.updateUserById(id, {
          ban_duration: body.active ? "none" : "876000h",
        });
        if (error) return fail(`차단 상태를 바꾸지 못했습니다: ${error.message}`, 500);
      }
      if (body.password !== undefined) {
        const bad = checkPassword(body.password);
        if (bad) return fail(bad);
        const { error } = await db.auth.admin.updateUserById(id, { password: body.password as string });
        if (error) return fail(`비밀번호를 바꾸지 못했습니다: ${error.message}`, 500);
      }
      if (Object.keys(patch).length) {
        const { error } = await db.from("members").update(patch).eq("id", id);
        if (error) return fail(error.message, 500);
      }
      return json({ ok: true });
    }

    default:
      return fail("알 수 없는 요청입니다.");
  }
});
