import {
  MAP_TIERS,
  MAP_TYPES,
  type MapTier,
  type MapTierId,
  type MapTypeId,
  type WorldMapType,
} from "@/lib/world/config/map-config";

type WorldControlsProps = {
  selectedMapTypeId: MapTypeId;
  selectedTierId: MapTierId;
  activeMapType: WorldMapType;
  activeTier: MapTier;
  seedText: string;
  showGrid: boolean;
  onMapTypeChange: (value: MapTypeId) => void;
  onTierChange: (value: MapTierId) => void;
  onSeedTextChange: (value: string) => void;
  onRegenerate: () => void;
  onRandomize: () => void;
  onGridChange: (value: boolean) => void;
};

export function WorldControls({
  selectedMapTypeId,
  selectedTierId,
  activeMapType,
  activeTier,
  seedText,
  showGrid,
  onMapTypeChange,
  onTierChange,
  onSeedTextChange,
  onRegenerate,
  onRandomize,
  onGridChange,
}: WorldControlsProps) {
  return (
    <div className="controls">
      <label>
        맵 타입
        <select
          value={selectedMapTypeId}
          onChange={(event) => onMapTypeChange(event.target.value as MapTypeId)}
        >
          {MAP_TYPES.map((mapType) => (
            <option key={mapType.id} value={mapType.id}>
              {mapType.label} · {mapType.description}
            </option>
          ))}
        </select>
      </label>
      <label>
        맵 등급
        <select
          value={selectedTierId}
          onChange={(event) => onTierChange(event.target.value as MapTierId)}
        >
          {MAP_TIERS.map((tier) => (
            <option key={tier.id} value={tier.id}>
              {tier.label} · 세력 {tier.factions} · {tier.columns}×{tier.rows}
            </option>
          ))}
        </select>
      </label>
      <span className="map-tier-active">
        적용 중: {activeMapType.label} · {activeTier.label} · 세력{" "}
        {activeTier.factions} · {activeTier.columns}×{activeTier.rows}
      </span>
      <label>
        월드 시드
        <input
          value={seedText}
          onChange={(event) => onSeedTextChange(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && onRegenerate()}
        />
      </label>
      <button onClick={onRegenerate}>이 시드로 생성</button>
      <button className="secondary" onClick={onRandomize}>
        새로운 세계
      </button>
      <label className="toggle">
        <input
          type="checkbox"
          checked={showGrid}
          onChange={(event) => onGridChange(event.target.checked)}
        />
        Hex 경계
      </label>
    </div>
  );
}
