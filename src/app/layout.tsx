import type { Metadata, Viewport } from "next";
import { Gowun_Batang, IBM_Plex_Mono, IBM_Plex_Sans_KR } from "next/font/google";
import { Header } from "@/components/Header";
import { MemberGate } from "@/components/MemberGate";
import "./globals.css";

const plexKr = IBM_Plex_Sans_KR({
  variable: "--font-plex-kr",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const gowun = Gowun_Batang({
  variable: "--font-gowun",
  weight: "700",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: "500",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "센 미디어 - 출연자 관리",
  description: "센 미디어 프로그램 출연자 정보를 등록하고 관리합니다.",
  applicationName: "cen-출연자",
  // 아이폰 '홈 화면에 추가'용 이름. 아이콘은 app/apple-icon.png.
  appleWebApp: { capable: true, title: "cen-출연자", statusBarStyle: "default" },
};

// 휴대폰 상단 상태 표시줄 색을 화면 바탕(--bg)에 맞춘다.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1615" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${plexKr.variable} ${gowun.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans text-[15px] leading-relaxed">
        <div className="mx-auto max-w-[860px] px-4 pt-6 pb-16">
          <Header />
          <MemberGate>{children}</MemberGate>
        </div>
      </body>
    </html>
  );
}
