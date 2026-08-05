import type { Metadata } from "next";
import { WorldPrototype } from "../world-prototype";

export const metadata: Metadata = {
  title: "영웅스토리 · 세계 생성 실험실",
  description: "역사 영웅과 함께 정복할 랜덤 세계를 만드는 지형 생성 프로토타입",
};

export default function WorldLabPage() {
  return <WorldPrototype />;
}
