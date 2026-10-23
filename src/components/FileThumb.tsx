"use client";

/** 이미지면 미리보기, 아니면 확장자 아이콘 */
export function FileThumb({
  blob,
  name,
  className = "size-8",
}: {
  blob: Blob;
  name: string;
  className?: string;
}) {
  const url = useObjectUrl(blob.type.startsWith("image/") ? blob : null);
  if (url) {
    // blob: URL이라 next/image 최적화 대상이 아니다.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={`${className} flex-none rounded-[5px] object-cover`} />;
  }
  const ext = (name.split(".").pop() ?? "").slice(0, 4).toUpperCase() || "FILE";
  return (
    <span
      aria-hidden="true"
      className={`${className} grid flex-none place-items-center rounded-[5px] bg-accent-soft text-[10px] font-bold text-accent`}
    >
      {ext}
    </span>
  );
}

// 같은 Blob에는 같은 URL을 돌려준다. 화면을 보는 동안만 쓰는 미리보기라 따로 해제하지 않는다.
const urlCache = new WeakMap<Blob, string>();

export function useObjectUrl(blob: Blob | null): string | null {
  if (!blob) return null;
  let url = urlCache.get(blob);
  if (!url) {
    url = URL.createObjectURL(blob);
    urlCache.set(blob, url);
  }
  return url;
}
