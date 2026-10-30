"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { formatDate, formatSize, manAge } from "@/lib/date";
import {
  ATTACHMENT_CATEGORIES,
  MAX_FILE_SIZE,
  PERFORMER_TYPES,
  PROGRAM_SUGGESTIONS,
  validatePerformer,
  type Attachment,
  type AttachmentCategory,
  type NewAttachment,
  type Performer,
  type PerformerErrors,
  type PerformerInput,
  type PerformerType,
} from "@/lib/performer";
import { addPerformer, updatePerformer } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import { FileThumb } from "./FileThumb";

/** 폼에 올려 둔 첨부파일. 새로 고른 파일(file)과 이미 저장된 파일(saved)을 같은 목록에 둔다. */
type DraftFile = { name: string; size: number; type: string } & (
  | { file: File; saved?: undefined }
  | { saved: Attachment; file?: undefined }
);
type DraftFiles = Record<AttachmentCategory, DraftFile[]>;

const EMPTY: DraftFiles = { photo: [], id: [], doc: [] };

function filesOf(performer?: Performer): DraftFiles {
  if (!performer) return EMPTY;
  const files: DraftFiles = { photo: [], id: [], doc: [] };
  for (const a of performer.attachments)
    files[a.category].push({ name: a.name, size: a.size, type: a.type, saved: a });
  return files;
}

const inputClass =
  "w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-ink aria-invalid:border-danger";

/**
 * 출연자 등록 폼. performer를 넘기면 그 출연자를 고치는 폼이 되고, 저장하거나 취소하면 onDone을 부른다.
 */
export function PerformerForm({ performer, onDone }: { performer?: Performer; onDone?: () => void }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  // 이전 화면이 숨겨진 채 남아 있어도 id가 겹치지 않도록 폼마다 접두어를 붙인다.
  const uid = useId();
  const fid = (key: string) => `${uid}${key}`;
  const [type, setType] = useState<PerformerType | "">(performer?.type ?? "");
  const [birth, setBirth] = useState(performer?.birth ?? "");
  const [airDate, setAirDate] = useState(performer?.airDate ?? "");
  const [files, setFiles] = useState(() => filesOf(performer));
  const [errors, setErrors] = useState<PerformerErrors>({});
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const today = useToday();
  const editing = !!performer;

  function addFiles(key: AttachmentCategory, list: FileList | null) {
    if (!list) return;
    const ok: DraftFile[] = [];
    const skipped: string[] = [];
    for (const f of Array.from(list)) {
      if (f.size > MAX_FILE_SIZE) skipped.push(f.name);
      else ok.push({ name: f.name, size: f.size, type: f.type, file: f });
    }
    setFiles((prev) => ({ ...prev, [key]: [...prev[key], ...ok] }));
    setNotice(skipped.length ? `10MB를 넘는 파일은 추가하지 않았습니다: ${skipped.join(", ")}` : "");
  }

  function removeFile(key: AttachmentCategory, index: number) {
    setFiles((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }));
  }

  // 고친 칸의 오류 문구는 바로 지운다.
  function clearError(e: FormEvent<HTMLFormElement>) {
    const key = (e.target as HTMLInputElement).name as keyof PerformerErrors;
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  /** 새 등록이면 빈 폼으로, 수정이면 저장되어 있던 내용으로 되돌린다. */
  function reset() {
    formRef.current?.reset();
    setType(performer?.type ?? "");
    setBirth(performer?.birth ?? "");
    setAirDate(performer?.airDate ?? "");
    setFiles(filesOf(performer));
    setErrors({});
    setNotice("");
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const text = (k: string) => String(data.get(k) ?? "").trim();
    const input: PerformerInput = {
      program: text("program"),
      episode: Number(text("episode")) || 0,
      airDate,
      item: text("item"),
      name: text("name"),
      type: type as PerformerType,
      typeEtc: type === "기타" ? text("typeEtc") : "",
      friendMemo: type === "지인" ? text("friendMemo") : "",
      birth,
      disease: text("disease"),
      fee: text("fee"),
      contact: text("contact"),
      memo: text("memo"),
    };
    const found = validatePerformer(input, today);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }

    const all = ATTACHMENT_CATEGORIES.flatMap((c) => files[c.key].map((f) => ({ ...f, category: c.key })));
    const keep = all.flatMap((f) => (f.saved ? [f.saved] : []));
    const newFiles: NewAttachment[] = all.flatMap((f) => (f.file ? [{ category: f.category, file: f.file }] : []));
    setSaving(true);
    try {
      if (performer) {
        await updatePerformer(performer, input, keep, newFiles);
        onDone?.();
      } else {
        await addPerformer(input, newFiles);
        router.push("/");
      }
    } catch {
      setNotice("저장하지 못했습니다. 인터넷 연결과 편집 권한을 확인하고 다시 시도해 주세요.");
      setSaving(false);
    }
  }

  const airAge = birth && airDate ? manAge(birth, airDate) : null;
  const todayAge = birth && today ? manAge(birth, today) : null;

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} onChange={clearError} className="mt-5 grid gap-4">
      <Section title="방송 정보">
        <Field id={fid("program")} label="프로그램명" error={errors.program}>
          <input
            id={fid("program")}
            name="program"
            type="text"
            list={fid("program-suggestions")}
            autoComplete="off"
            defaultValue={performer?.program}
            placeholder="예: 인생의 연장전, 질병의 법칙, 중독자들"
            aria-invalid={!!errors.program}
            className={inputClass}
          />
          <datalist id={fid("program-suggestions")}>
            {PROGRAM_SUGGESTIONS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Field>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field id={fid("episode")} label="방송회차" error={errors.episode}>
            <div className="flex items-center gap-2 text-muted">
              <span>제</span>
              <input
                id={fid("episode")}
                name="episode"
                type="number"
                min={1}
                inputMode="numeric"
                defaultValue={performer?.episode}
                placeholder="128"
                aria-invalid={!!errors.episode}
                className={inputClass}
              />
              <span>회</span>
            </div>
          </Field>
          <Field id={fid("airDate")} label="방송일" error={errors.airDate}>
            <input
              id={fid("airDate")}
              name="airDate"
              type="date"
              value={airDate}
              onChange={(e) => setAirDate(e.target.value)}
              aria-invalid={!!errors.airDate}
              className={inputClass}
            />
          </Field>
        </div>
        <Field id={fid("item")} label="아이템" error={errors.item}>
          <input
            id={fid("item")}
            name="item"
            type="text"
            defaultValue={performer?.item}
            placeholder="예: 파라다이스 그레인, 캡슐레이션 효소"
            aria-invalid={!!errors.item}
            className={inputClass}
          />
        </Field>
      </Section>

      <Section title="출연자 정보">
        <Field id={fid("name")} label="출연자 이름" error={errors.name}>
          <input
            id={fid("name")}
            name="name"
            type="text"
            autoComplete="off"
            defaultValue={performer?.name}
            placeholder="홍길동"
            aria-invalid={!!errors.name}
            className={inputClass}
          />
        </Field>

        <div role="radiogroup" aria-labelledby={fid("type-label")} className="grid min-w-0 gap-1.5">
          <div id={fid("type-label")} className="text-sm font-semibold">
            출연자 유형<Required />
          </div>
          <div className="flex flex-wrap gap-2">
            {PERFORMER_TYPES.map((t) => (
              <label
                key={t}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-bg px-3.5 py-1.5 text-sm has-checked:border-accent has-checked:bg-accent-soft has-checked:font-semibold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
              >
                <input
                  type="radio"
                  name="type"
                  value={t}
                  checked={type === t}
                  onChange={() => setType(t)}
                  className="m-0 accent-accent"
                />
                {t}
              </label>
            ))}
          </div>
          {type === "기타" && (
            <input
              name="typeEtc"
              type="text"
              aria-label="기타 유형"
              defaultValue={performer?.typeEtc}
              placeholder="기타 유형을 적어 주세요 (예: 가족, 보호자)"
              autoFocus={!editing}
              className={inputClass}
            />
          )}
          {type === "지인" && (
            <textarea
              name="friendMemo"
              rows={2}
              aria-label="지인 메모"
              defaultValue={performer?.friendMemo}
              placeholder="누구의 지인인지, 섭외 경로 등을 적어 주세요 (예: 김OO 작가 지인, 2025년 체험단 소개)"
              autoFocus={!editing}
              className={`${inputClass} resize-y`}
            />
          )}
          {errors.type && <p className="text-xs text-danger">{errors.type}</p>}
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field id={fid("fee")} label="출연료" error={errors.fee}>
            <input
              id={fid("fee")}
              name="fee"
              type="text"
              autoComplete="off"
              defaultValue={performer?.fee}
              placeholder="예: 100만원, 지인 출연 포함"
              aria-invalid={!!errors.fee}
              className={inputClass}
            />
          </Field>
          <Field id={fid("contact")} label="연락처" optional>
            <input
              id={fid("contact")}
              name="contact"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              defaultValue={performer?.contact}
              placeholder="예: 010-1234-5678"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field id={fid("birth")} label="생년월일" error={errors.birth}>
            <input
              id={fid("birth")}
              name="birth"
              type="date"
              min="1900-01-01"
              max={today || undefined}
              value={birth}
              onChange={(e) => setBirth(e.target.value)}
              aria-invalid={!!errors.birth}
              className={inputClass}
            />
          </Field>
          <div className="grid min-w-0 gap-1.5">
            <div className="text-sm font-semibold">
              만 나이 <span className="text-xs font-normal text-muted">(생년월일로 자동 계산)</span>
            </div>
            <div
              aria-live="polite"
              className="flex flex-wrap items-baseline gap-x-5 gap-y-1 rounded-lg bg-accent-soft px-3 py-2.5 text-[13px] text-muted"
            >
              {todayAge == null ? (
                <span>생년월일을 입력하면 계산됩니다.</span>
              ) : todayAge < 0 ? (
                <span>생년월일이 오늘보다 뒤입니다.</span>
              ) : airAge != null ? (
                <>
                  <span className="font-mono text-xl text-accent">만 {airAge}세</span>
                  <span>방송일({formatDate(airDate)}) 기준</span>
                  <span>오늘 기준 만 {todayAge}세</span>
                </>
              ) : (
                <>
                  <span className="font-mono text-xl text-accent">만 {todayAge}세</span>
                  <span>오늘 기준 · 방송일을 넣으면 방송일 기준도 보여 줍니다</span>
                </>
              )}
            </div>
          </div>
        </div>

        <Field id={fid("disease")} label="질병 유형" optional>
          <input
            id={fid("disease")}
            name="disease"
            type="text"
            autoComplete="off"
            defaultValue={performer?.disease}
            placeholder="예: 폐암 4기"
            className={inputClass}
          />
        </Field>

        <Field id={fid("memo")} label="메모" optional>
          <textarea
            id={fid("memo")}
            name="memo"
            rows={2}
            defaultValue={performer?.memo}
            placeholder="예: 까다로움, 블랙리스트"
            className={`${inputClass} resize-y`}
          />
        </Field>
      </Section>

      <Section title="첨부파일">
        <div className="grid gap-3 sm:grid-cols-3">
          {ATTACHMENT_CATEGORIES.map((c) => (
            <DropZone
              key={c.key}
              inputId={fid(`file-${c.key}`)}
              category={c}
              files={files[c.key]}
              onAdd={(list) => addFiles(c.key, list)}
              onRemove={(i) => removeFile(c.key, i)}
            />
          ))}
        </div>
        <p className="text-xs text-muted">파일은 회원만 열 수 있는 저장소에 보관됩니다. 파일 하나당 최대 10MB.</p>
      </Section>

      {notice && (
        <p role="status" className="rounded-lg bg-accent-soft px-3 py-2.5 text-[13px] text-ink">
          {notice}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2.5">
        {editing && (
          <button
            type="button"
            onClick={onDone}
            className="mr-auto rounded-[9px] border border-line bg-surface px-5 py-2.5 font-semibold"
          >
            취소
          </button>
        )}
        <button
          type="button"
          onClick={reset}
          className="rounded-[9px] border border-line bg-surface px-5 py-2.5 font-semibold"
        >
          {editing ? "되돌리기" : "초기화"}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-[9px] border border-accent bg-accent px-5 py-2.5 font-semibold text-accent-ink disabled:cursor-progress disabled:opacity-60"
        >
          {saving ? "저장하는 중…" : editing ? "수정 저장" : "출연자 등록"}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid min-w-0 gap-3.5 rounded-xl border border-line bg-surface p-4">
      <legend className="px-1.5 text-[13px] font-bold tracking-wide text-accent">{title}</legend>
      {children}
    </fieldset>
  );
}

function Required() {
  return (
    <span aria-hidden="true" className="ml-0.5 text-danger">
      *
    </span>
  );
}

function Field({
  id,
  label,
  error,
  optional,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  /** 꼭 채우지 않아도 되는 칸 */
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        {optional ? <span className="ml-1 text-xs font-normal text-muted">(선택)</span> : <Required />}
      </label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

function DropZone({
  inputId,
  category,
  files,
  onAdd,
  onRemove,
}: {
  inputId: string;
  category: (typeof ATTACHMENT_CATEGORIES)[number];
  files: DraftFile[];
  onAdd: (list: FileList | null) => void;
  onRemove: (index: number) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onAdd(e.dataTransfer.files);
      }}
      className={`grid min-w-0 content-start gap-2 rounded-[10px] border-[1.5px] border-dashed p-3 ${
        over ? "border-accent bg-accent-soft" : "border-line bg-bg"
      }`}
    >
      <span className="text-sm font-semibold">{category.label}</span>
      <span className="text-xs text-muted">{category.desc} · 끌어다 놓거나 선택</span>
      <input
        id={inputId}
        type="file"
        multiple
        accept={category.accept}
        onChange={(e) => {
          onAdd(e.target.files);
          e.target.value = "";
        }}
        className="peer sr-only"
      />
      <label
        htmlFor={inputId}
        className="justify-self-start cursor-pointer rounded-[7px] border border-line bg-surface px-2.5 py-1 text-[13px] font-semibold text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
      >
        파일 선택
      </label>
      {files.length > 0 && (
        <ul className="grid gap-1.5">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex min-w-0 items-center gap-2 text-[13px]">
              <FileThumb
                source={f.file ? { blob: f.file } : { path: f.saved.path }}
                name={f.name}
                type={f.type}
              />
              <span className="min-w-0 flex-1 truncate" title={f.name}>
                {f.name}
              </span>
              <span className="font-mono text-[11px] text-muted">{formatSize(f.size)}</span>
              <button
                type="button"
                aria-label={`${f.name} 삭제`}
                onClick={() => onRemove(i)}
                className="px-1 text-xs text-danger"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
