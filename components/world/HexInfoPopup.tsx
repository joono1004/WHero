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
      <span>선택한 Hex 지형 정보</span>
      <strong>{popup.diagnostic.terrain}</strong>
      <em>
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
