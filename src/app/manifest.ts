import type { MetadataRoute } from "next";

// 휴대폰 '홈 화면에 추가'로 설치했을 때의 이름·아이콘·색. 아이콘 원본은 src/app/icon.svg.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "cen-출연자",
    short_name: "cen-출연자",
    description: "센 미디어 프로그램 출연자 정보를 등록하고 관리합니다.",
    lang: "ko",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f6f6",
    theme_color: "#f4f6f6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
