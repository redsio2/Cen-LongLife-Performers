"use client";

import { useEffect, useState } from "react";
import { signedUrl } from "@/lib/store";

/** 보여 줄 파일: 방금 고른 파일(blob)이나 저장소에 있는 파일(path) 중 하나 */
export type FileSource = { blob: Blob; path?: undefined } | { path: string; blob?: undefined };

/** 이미지면 미리보기, 아니면 확장자 아이콘 */
export function FileThumb({
  source,
  name,
  type,
  className = "size-8",
}: {
  source: FileSource;
  name: string;
  type: string;
  className?: string;
}) {
  const url = useFileUrl(type.startsWith("image/") ? source : null);
  if (url) {
    // blob:·서명 주소라 next/image 최적화 대상이 아니다.
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

function objectUrl(blob: Blob): string {
  let url = urlCache.get(blob);
  if (!url) {
    url = URL.createObjectURL(blob);
    urlCache.set(blob, url);
  }
  return url;
}

/** 파일을 열 수 있는 주소. 저장소 파일은 서명된 주소를 받아 올 때까지 null이다. */
export function useFileUrl(source: FileSource | null): string | null {
  const path = source?.path;
  const [signed, setSigned] = useState<{ path: string; url: string } | null>(null);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    signedUrl(path)
      .then((url) => alive && setSigned({ path, url }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [path]);
  if (source?.blob) return objectUrl(source.blob);
  return path && signed?.path === path ? signed.url : null;
}
