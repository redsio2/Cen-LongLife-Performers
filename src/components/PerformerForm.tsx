"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { formatDate, formatSize, manAge } from "@/lib/date";
import {
  ATTACHMENT_CATEGORIES,
  MAX_FILE_SIZE,
  PERFORMER_TYPES,
  validatePerformer,
  type AttachmentCategory,
  type PerformerErrors,
  type PerformerInput,
  type PerformerType,
} from "@/lib/performer";
import { addPerformer } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import { FileThumb } from "./FileThumb";

const EMPTY: Record<AttachmentCategory, File[]> = { photo: [], id: [], doc: [] };

const inputClass =
  "w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-ink aria-invalid:border-danger";

export function PerformerForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<PerformerType | "">("");
  const [birth, setBirth] = useState("");
  const [airDate, setAirDate] = useState("");
  const [files, setFiles] = useState(EMPTY);
  const [errors, setErrors] = useState<PerformerErrors>({});
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const today = useToday();

  function addFiles(key: AttachmentCategory, list: FileList | null) {
    if (!list) return;
    const ok: File[] = [];
    const skipped: string[] = [];
    for (const f of Array.from(list)) {
      if (f.size > MAX_FILE_SIZE) skipped.push(f.name);
      else ok.push(f);
    }
    setFiles((prev) => ({ ...prev, [key]: [...prev[key], ...ok] }));
    setNotice(skipped.length ? `10MB를 넘는 파일은 추가하지 않았습니다: ${skipped.join(", ")}` : "");
  }

  function removeFile(key: AttachmentCategory, index: number) {
    setFiles((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }));
  }

  // 고친 칸의 오류 문구는 바로 지운다.
  function clearError(e: FormEvent<HTMLFormElement>) {
    const id = (e.target as HTMLElement).id;
    const key = (id.startsWith("type-") ? "type" : id) as keyof PerformerErrors;
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function reset() {
    formRef.current?.reset();
    setType("");
    setBirth("");
    setAirDate("");
    setFiles(EMPTY);
    setErrors({});
    setNotice("");
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const text = (k: string) => String(data.get(k) ?? "").trim();
    const input: PerformerInput = {
      episode: Number(text("episode")) || 0,
      airDate,
      item: text("item"),
      name: text("name"),
      type: type as PerformerType,
      typeEtc: type === "기타" ? text("typeEtc") : "",
      birth,
    };
    const found = validatePerformer(input, today);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(first === "type" ? "type-0" : first)?.focus();
      return;
    }

    setSaving(true);
    try {
      await addPerformer(
        input,
        ATTACHMENT_CATEGORIES.flatMap((c) =>
          files[c.key].map((f) => ({ category: c.key, name: f.name, size: f.size, type: f.type, blob: f })),
        ),
      );
      router.push("/");
    } catch {
      setNotice("저장하지 못했습니다. 첨부파일 용량을 줄이거나 사생활 보호 모드가 아닌 창에서 다시 시도해 주세요.");
      setSaving(false);
    }
  }

  const airAge = birth && airDate ? manAge(birth, airDate) : null;
  const todayAge = birth && today ? manAge(birth, today) : null;

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} onChange={clearError} className="mt-5 grid gap-4">
      <Section title="방송 정보">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field id="episode" label="방송회차" error={errors.episode}>
            <div className="flex items-center gap-2 text-muted">
              <span>제</span>
              <input
                id="episode"
                name="episode"
                type="number"
                min={1}
                inputMode="numeric"
                placeholder="128"
                aria-invalid={!!errors.episode}
                className={inputClass}
              />
              <span>회</span>
            </div>
          </Field>
          <Field id="airDate" label="방송일" error={errors.airDate}>
            <input
              id="airDate"
              type="date"
              value={airDate}
              onChange={(e) => setAirDate(e.target.value)}
              aria-invalid={!!errors.airDate}
              className={inputClass}
            />
          </Field>
        </div>
        <Field id="item" label="아이템" error={errors.item}>
          <input
            id="item"
            name="item"
            type="text"
            placeholder="예: 무릎 관절 회복 운동, 혈당 관리 식단"
            aria-invalid={!!errors.item}
            className={inputClass}
          />
        </Field>
      </Section>

      <Section title="출연자 정보">
        <Field id="name" label="출연자 이름" error={errors.name}>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="off"
            placeholder="홍길동"
            aria-invalid={!!errors.name}
            className={inputClass}
          />
        </Field>

        <div role="radiogroup" aria-labelledby="type-label" className="grid min-w-0 gap-1.5">
          <div id="type-label" className="text-sm font-semibold">
            출연자 유형<Required />
          </div>
          <div className="flex flex-wrap gap-2">
            {PERFORMER_TYPES.map((t, i) => (
              <label
                key={t}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-bg px-3.5 py-1.5 text-sm has-checked:border-accent has-checked:bg-accent-soft has-checked:font-semibold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
              >
                <input
                  id={`type-${i}`}
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
              placeholder="기타 유형을 적어 주세요 (예: 전문의, 가족)"
              autoFocus
              className={inputClass}
            />
          )}
          {errors.type && <p className="text-xs text-danger">{errors.type}</p>}
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field id="birth" label="생년월일" error={errors.birth}>
            <input
              id="birth"
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
      </Section>

      <Section title="첨부파일">
        <div className="grid gap-3 sm:grid-cols-3">
          {ATTACHMENT_CATEGORIES.map((c) => (
            <DropZone
              key={c.key}
              category={c}
              files={files[c.key]}
              onAdd={(list) => addFiles(c.key, list)}
              onRemove={(i) => removeFile(c.key, i)}
            />
          ))}
        </div>
        <p className="text-xs text-muted">파일은 이 브라우저에만 저장됩니다. 파일 하나당 최대 10MB.</p>
      </Section>

      {notice && (
        <p role="status" className="rounded-lg bg-accent-soft px-3 py-2.5 text-[13px] text-ink">
          {notice}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2.5">
        <button
          type="button"
          onClick={reset}
          className="rounded-[9px] border border-line bg-surface px-5 py-2.5 font-semibold"
        >
          초기화
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-[9px] border border-accent bg-accent px-5 py-2.5 font-semibold text-accent-ink disabled:cursor-progress disabled:opacity-60"
        >
          {saving ? "저장하는 중…" : "출연자 등록"}
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
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        <Required />
      </label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

function DropZone({
  category,
  files,
  onAdd,
  onRemove,
}: {
  category: (typeof ATTACHMENT_CATEGORIES)[number];
  files: File[];
  onAdd: (list: FileList | null) => void;
  onRemove: (index: number) => void;
}) {
  const [over, setOver] = useState(false);
  const inputId = `file-${category.key}`;
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
              <FileThumb blob={f} name={f.name} />
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
