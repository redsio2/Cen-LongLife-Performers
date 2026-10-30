import type { CellObject } from "write-excel-file/universal";
import { formatSize, manAge, todayString } from "./date";
import { ATTACHMENT_CATEGORIES, typeLabel, type Attachment, type Performer } from "./performer";
import { signedUrl } from "./store";

/** 브라우저에서 파일 저장 창을 띄운다. */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  // 다운로드가 시작된 뒤에 주소를 해제한다.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** 파일 이름에 쓸 수 없는 글자를 뺀다. */
const safeName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, "_").trim() || "파일";

const formatDateTime = (ms?: number) =>
  ms ? new Date(ms).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" }) : "";

/**
 * 출연자 목록을 엑셀(.xlsx)로 내려받는다. 만 나이는 화면에서 고른 기준일(reference)로 계산한다.
 */
export async function downloadPerformersXlsx(
  performers: Performer[],
  reference: (p: Performer) => string,
  referenceLabel: string,
  fileLabel: string,
) {
  // 엑셀 라이브러리는 버튼을 누를 때만 불러온다.
  const { default: writeXlsxFile } = await import("write-excel-file/universal");
  const text = (value: string) => ({ value });
  const header = (title: string) => ({ value: title, fontWeight: "bold" as const });
  const columns: { title: string; width: number; cell: (p: Performer) => CellObject }[] = [
    { title: "회차", width: 6, cell: (p) => ({ value: p.episode }) },
    { title: "방송일", width: 12, cell: (p) => text(p.airDate) },
    { title: "프로그램", width: 14, cell: (p) => text(p.program) },
    { title: "아이템", width: 22, cell: (p) => text(p.item) },
    { title: "출연자 이름", width: 12, cell: (p) => text(p.name) },
    { title: "출연자 유형", width: 14, cell: (p) => text(typeLabel(p)) },
    { title: "지인 메모", width: 20, cell: (p) => text(p.type === "지인" ? p.friendMemo : "") },
    { title: "출연료", width: 18, cell: (p) => text(p.fee) },
    { title: "연락처", width: 15, cell: (p) => text(p.contact) },
    { title: "생년월일", width: 12, cell: (p) => text(p.birth) },
    {
      title: `만 나이(${referenceLabel})`,
      width: 14,
      cell: (p) => {
        const age = manAge(p.birth, reference(p));
        return { value: age == null || age < 0 ? undefined : age };
      },
    },
    { title: "질병 유형", width: 16, cell: (p) => text(p.disease) },
    { title: "메모", width: 30, cell: (p) => text(p.memo) },
    {
      title: "첨부파일",
      width: 30,
      cell: (p) => text(p.attachments.map((a) => `${categoryLabel(a.category)}: ${a.name}`).join("\n")),
    },
    { title: "등록일", width: 16, cell: (p) => text(formatDateTime(p.createdAt)) },
    { title: "수정일", width: 16, cell: (p) => text(formatDateTime(p.updatedAt)) },
  ];

  const blob = await writeXlsxFile(performers, {
    columns: columns.map((c) => ({ header: header(c.title), cell: c.cell, width: c.width })),
    sheet: "출연자",
    stickyRowsCount: 1,
  }).toBlob();
  saveBlob(blob, `${safeName(fileLabel)}_${todayString()}.xlsx`);
}

const categoryLabel = (key: Attachment["category"]) =>
  ATTACHMENT_CATEGORIES.find((c) => c.key === key)?.label ?? "기타";

async function fetchFile(a: Attachment): Promise<Blob> {
  const res = await fetch(await signedUrl(a.path));
  if (!res.ok) throw new Error(`${a.name}을(를) 받지 못했습니다.`);
  return res.blob();
}

/**
 * 첨부파일을 내려받는다. 하나면 그 파일 그대로, 여러 개면 분류별 폴더로 묶은 zip 하나로 받는다.
 */
export async function downloadAttachments(performerName: string, files: Attachment[]) {
  if (files.length === 0) return;
  if (files.length === 1) {
    saveBlob(await fetchFile(files[0]), files[0].name);
    return;
  }
  const { zipSync } = await import("fflate");
  const entries: Record<string, Uint8Array> = {};
  for (const a of files) {
    const data = new Uint8Array(await (await fetchFile(a)).arrayBuffer());
    // 같은 이름이 있으면 (2), (3)을 붙인다.
    const base = `${categoryLabel(a.category)}/${safeName(a.name)}`;
    let name = base;
    for (let i = 2; name in entries; i++) name = base.replace(/(\.[^./]+)?$/, ` (${i})$1`);
    // 사진·PDF는 이미 압축되어 있어 다시 압축하지 않는다.
    entries[name] = data;
  }
  const zip = zipSync(entries, { level: 0 });
  saveBlob(new Blob([zip], { type: "application/zip" }), `${safeName(performerName)}_첨부파일.zip`);
}

export const totalSize = (files: Attachment[]) => formatSize(files.reduce((s, a) => s + a.size, 0));
