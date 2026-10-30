import type { Attachment, NewAttachment, Performer, PerformerInput, PerformerType } from "./performer";
import { supabase } from "./supabase";

// 출연자는 Supabase 데이터베이스에, 첨부파일은 비공개 저장소(attachments 버킷)에 둔다.
// 누가 읽고 쓸 수 있는지는 데이터베이스의 RLS 정책이 정한다(보기 전용 회원은 읽기만).
const BUCKET = "attachments";

type AttachmentRow = {
  id: string;
  category: Attachment["category"];
  name: string;
  size: number;
  type: string;
  path: string;
};

type PerformerRow = {
  id: string;
  created_at: string;
  updated_at: string | null;
  program: string;
  episode: number;
  air_date: string;
  item: string;
  name: string;
  type: PerformerType;
  type_etc: string;
  friend_memo: string;
  birth: string;
  fee: string;
  disease: string;
  memo: string;
  performer_attachments: AttachmentRow[];
};

function fromRow(r: PerformerRow): Performer {
  return {
    id: r.id,
    createdAt: Date.parse(r.created_at),
    updatedAt: r.updated_at ? Date.parse(r.updated_at) : undefined,
    program: r.program,
    episode: r.episode,
    airDate: r.air_date,
    item: r.item,
    name: r.name,
    type: r.type,
    typeEtc: r.type_etc,
    friendMemo: r.friend_memo,
    birth: r.birth,
    fee: r.fee,
    disease: r.disease,
    memo: r.memo,
    attachments: r.performer_attachments.map(({ id, category, name, size, type, path }) => ({
      id,
      category,
      name,
      size,
      type,
      path,
    })),
  };
}

function toRow(v: PerformerInput) {
  return {
    program: v.program,
    episode: v.episode,
    air_date: v.airDate,
    item: v.item,
    name: v.name,
    type: v.type,
    type_etc: v.typeEtc,
    friend_memo: v.friendMemo,
    birth: v.birth,
    fee: v.fee,
    disease: v.disease,
    memo: v.memo,
  };
}

/** 최신 등록순 */
export async function listPerformers(): Promise<Performer[]> {
  const { data, error } = await supabase
    .from("performers")
    .select("*, performer_attachments(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as PerformerRow[]).map(fromRow);
}

/** 파일을 저장소에 올리고 첨부 목록에 넣는다. 저장소 경로에는 원래 파일 이름 대신 무작위 이름을 쓴다. */
async function upload(performerId: string, files: NewAttachment[]) {
  for (const { category, file } of files) {
    const ext = file.name.includes(".") ? `.${file.name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")}` : "";
    const path = `${performerId}/${crypto.randomUUID()}${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || undefined });
    if (uploadError) throw uploadError;
    const { error } = await supabase.from("performer_attachments").insert({
      performer_id: performerId,
      category,
      name: file.name,
      size: file.size,
      type: file.type,
      path,
    });
    if (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      throw error;
    }
  }
}

async function removeAttachments(attachments: Attachment[]) {
  if (attachments.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET).remove(attachments.map((a) => a.path));
  if (error) throw error;
  const { error: rowError } = await supabase
    .from("performer_attachments")
    .delete()
    .in(
      "id",
      attachments.map((a) => a.id),
    );
  if (rowError) throw rowError;
}

export async function addPerformer(input: PerformerInput, files: NewAttachment[]): Promise<void> {
  const { data, error } = await supabase.from("performers").insert(toRow(input)).select("id").single();
  if (error) throw error;
  await upload(data.id, files);
}

/**
 * 등록일은 그대로 두고 내용을 바꾼다. 기존 첨부파일 중 keep에 없는 것은 지우고, files는 새로 올린다.
 */
export async function updatePerformer(
  original: Performer,
  input: PerformerInput,
  keep: Attachment[],
  files: NewAttachment[],
): Promise<void> {
  const { error } = await supabase
    .from("performers")
    .update({ ...toRow(input), updated_at: new Date().toISOString() })
    .eq("id", original.id);
  if (error) throw error;
  const kept = new Set(keep.map((a) => a.id));
  await removeAttachments(original.attachments.filter((a) => !kept.has(a.id)));
  await upload(original.id, files);
}

/** 첨부파일까지 함께 지운다. */
export async function deletePerformer(p: Performer): Promise<void> {
  await removeAttachments(p.attachments);
  const { error } = await supabase.from("performers").delete().eq("id", p.id);
  if (error) throw error;
}

// 비공개 파일은 잠깐 쓸 수 있는 서명된 주소로 연다. 같은 파일은 한 시간 동안 같은 주소를 다시 쓴다.
const SIGNED_URL_SECONDS = 60 * 60;
const signedUrls = new Map<string, { url: Promise<string>; expires: number }>();

export function signedUrl(path: string): Promise<string> {
  const hit = signedUrls.get(path);
  if (hit && hit.expires > Date.now()) return hit.url;
  const url = supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS)
    .then(({ data, error }) => {
      if (error) {
        signedUrls.delete(path);
        throw error;
      }
      return data.signedUrl;
    });
  // 만료 5분 전부터는 새 주소를 받는다.
  signedUrls.set(path, { url, expires: Date.now() + (SIGNED_URL_SECONDS - 300) * 1000 });
  return url;
}
