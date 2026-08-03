import { useState } from "react";
import type { CoastKind } from "@/lib/world/model/world-map";
import { FACTION_VISUALS } from "@/lib/world/prototype/faction-visual";

type TerrainLegendProps = {
  coastStats: Record<CoastKind, number>;
};

export function TerrainLegend({ coastStats }: TerrainLegendProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside className={`legend ${isOpen ? "is-open" : ""}`}>
      <button
        type="button"
        className="legend-toggle"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        지형 범례
      </button>
      <div className="legend-content">
      <strong>2.5D 지형 범례</strong>
      <span>
        <i className="legend-plain" />
        평원·일반 육지 <b>{coastStats.land}</b>
      </span>
      <span>
        <i className="legend-beach" />
        백사장 <b>{coastStats.beach}</b>
      </span>
      <span>
        <i className="legend-cliff" />
        바위 해안 <b>{coastStats.cliff}</b>
      </span>
      <span>
        <i className="legend-shallow" />
        얕은 바다 <b>{coastStats.shallow}</b>
      </span>
      <span>
        <i className="legend-deep" />
        깊은 바다 <b>{coastStats.deep}</b>
      </span>
      <span><i className="legend-river" />강</span>
      <span><i className="legend-forest" />숲</span>
      <span><i className="legend-wetland" />습지</span>
      <span><i className="legend-hill" />언덕</span>
      <span><i className="legend-mountain" />산악</span>
      <span><i className="legend-snow" />설산 정상</span>
      <strong className="legend-section-title">세력 색상</strong>
      {FACTION_VISUALS.map((faction) => (
        <span key={faction.id}>
          <i
            className="legend-faction"
            style={{
              background: `linear-gradient(135deg, ${faction.color}, ${faction.darkColor})`,
            }}
          />
          {faction.label}
        </span>
      ))}
      </div>
    </aside>
  );
}
