import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "영웅스토리",
  description: "역사 영웅과 여러 부대를 운용해 절차적으로 생성되는 세계를 정복하는 턴제 전략 게임",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
