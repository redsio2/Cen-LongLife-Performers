"use client";

import { useEffect } from "react";
import { useFileUrl, type FileSource } from "./FileThumb";

export function ImageViewer({
  source,
  caption,
  onClose,
}: {
  source: FileSource;
  caption: string;
  onClose: () => void;
}) {
  const url = useFileUrl(source);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-label={caption}
      onClick={onClose}
      className="fixed inset-0 z-40 grid cursor-zoom-out place-items-center bg-black/80 p-4"
    >
      <figure className="m-0">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={caption} className="max-h-[85vh] max-w-full rounded-lg" />
        ) : (
          <p className="text-[13px] text-white">불러오는 중…</p>
        )}
        <figcaption className="mt-2 text-center text-[13px] text-white">{caption}</figcaption>
      </figure>
    </div>
  );
}
