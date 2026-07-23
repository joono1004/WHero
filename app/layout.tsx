import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "World in Hero · 세계 생성 실험실",
  description: "역사 영웅과 함께 정복할 랜덤 세계를 만드는 전략 게임 프로토타입",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
