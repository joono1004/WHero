import type { SelectedHexPopup } from "@/lib/world/model/world-map";

type HexInfoPopupProps = {
  popup: SelectedHexPopup | null;
};

export function HexInfoPopup({ popup }: HexInfoPopupProps) {
  if (!popup) return null;

  return (
    <div
      className="hex-info-popup"
      style={{
        left: popup.x,
        top: popup.y,
      }}
    >
      <span>{popup.diagnostic.actor || popup.diagnostic.structure ? "대상 · 지형 정보" : "선택한 Hex 지형 정보"}</span>
      {popup.diagnostic.actor && (
        <em>
          <b>{popup.diagnostic.actor.name}</b>
          {" · "}
          {popup.diagnostic.actor.kind === "hero" ? "영웅" : "병사"}
          <br />
          체력 {popup.diagnostic.actor.hp}/{popup.diagnostic.actor.maxHp}
        </em>
      )}
      {popup.diagnostic.structure && (
        <em>
          <b>{popup.diagnostic.structure.name}</b>
          {popup.diagnostic.structure.isCapital ? " · 수도" : ""}
          <br />
          도시 단계 {popup.diagnostic.structure.level} · 시야 {popup.diagnostic.structure.visionRadius}칸
        </em>
      )}
      <strong>{popup.diagnostic.terrain}</strong>
      <em>
        이동 비용 {popup.diagnostic.movementCost ?? "이동 불가"}
        <br />
        좌표 {popup.diagnostic.column}, {popup.diagnostic.row}
        <br />
        해안 판정 {popup.diagnostic.kind} · 높이{" "}
        {popup.diagnostic.height.toFixed(3)}
        <br />
        렌더층 {popup.diagnostic.layer}
      </em>
    </div>
  );
}
