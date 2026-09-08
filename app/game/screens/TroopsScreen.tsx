import type { CSSProperties } from "react";
import type { Faction } from "../../../lib/game/faction.ts";
import type { UnitTypeId } from "../../../lib/game/ids.ts";
import { activeEvolutionFor, isUnitTypeUnlockedFor } from "../../../lib/game/unit-evolution.ts";
import { unitTypesInLine } from "../../../lib/game/unit-production.ts";
import type { TroopLine } from "../../../lib/game/unit-production.ts";
import { TROOP_LINE_LABEL } from "../researchLabels.ts";

// 맵에서 실제로 쓰는 병사 스프라이트를 같은 병과 트리에도 사용한다.
const TREE_LINES: TroopLine[] = ["infantry", "cavalry", "archer", "strategist"];
const GRADE_BY_TIER = ["D", "C", "B", "A", "S", "SS"];
const GRADE_ART: Record<string, string> = {
  D: "/art/heroes/grades-v2/grade-d.png", C: "/art/heroes/grades-v2/grade-c.png", B: "/art/heroes/grades-v2/grade-b.png",
  A: "/art/heroes/grades-v2/grade-a.png", S: "/art/heroes/grades-v2/grade-s.png", SS: "/art/heroes/grades-v2/grade-ss.png",
};
const ROW_TOP: Record<TroopLine, string> = { infantry: "20%", cavalry: "43%", archer: "66%", strategist: "89%" };
const UNIT_ART: Record<TroopLine, { src: string; alt: string; isEmblem?: boolean }> = {
  infantry: { src: "/art/units/infantry-chibi-map-v5.png", alt: "보병" },
  cavalry: { src: "/art/units/cavalry-chibi-map-v3.webp", alt: "기병" },
  archer: { src: "/art/units/archer-chibi-map-v3.webp", alt: "궁병" },
  strategist: { src: "/art/units/strategist-chibi-map-v1.png", alt: "책사" },
};

const STRATEGIST_ART_BY_UNIT: Partial<Record<UnitTypeId, { src: string; alt: string; isEmblem?: boolean }>> = {
  strategist: { src: "/art/units/strategist-chibi-map-v1.png", alt: "책사" },
  strategist_advisor: { src: "/art/units/aide-chibi-map-v1.png", alt: "참모" },
};

function nodePosition(left: string, top: string): CSSProperties {
  return { "--node-left": left, "--node-top": top } as CSSProperties;
}

export function TroopsScreen({ faction, onBack, onSetActive }: {
  faction: Faction;
  onBack: () => void;
  onSetActive: (line: TroopLine, unitType: UnitTypeId) => void;
}) {
  return (
    <section className="troop-ledger" aria-label="병과 편성">
      <header className="hero-ledger__header troop-ledger__header">
        <button className="hero-ledger__back" onClick={onBack} aria-label="로비로 돌아가기" title="뒤로가기" />
        <div><p className="troop-ledger__eyebrow">FORMATION TREE</p><h2>병과 편성</h2></div>
      </header>
      <main className="troop-tree" aria-label="병과 조합 트리">
        <div className="troop-tree__stage">
          <TreeWires />
          <div className="troop-tree__grades" aria-hidden="true">
            {GRADE_BY_TIER.map((grade, index) => <span key={grade} style={{ left: `${10 + index * 15}%` }}><img src={GRADE_ART[grade]} alt={`${grade}등급`} /></span>)}
          </div>
          {TREE_LINES.map((line) => <TroopLineBranch key={line} line={line} faction={faction} onSetActive={onSetActive} />)}
        </div>
      </main>
    </section>
  );
}

function TroopLineBranch({ line, faction, onSetActive }: { line: TroopLine; faction: Faction; onSetActive: (line: TroopLine, unitType: UnitTypeId) => void }) {
  const activeUnitType = activeEvolutionFor(faction, line);
  return <>
    <div className="troop-tree__line-name" style={nodePosition("2.2%", ROW_TOP[line])}>{TROOP_LINE_LABEL[line]}</div>
    {unitTypesInLine(line).map((unit, tier) => {
      const unlocked = isUnitTypeUnlockedFor(faction, unit.id);
      const active = unlocked && unit.id === activeUnitType;
      const art = line === "strategist" ? (STRATEGIST_ART_BY_UNIT[unit.id] ?? UNIT_ART.strategist) : UNIT_ART[line];
      return <button key={unit.id} type="button" className={`troop-tree__node${unlocked ? "" : " is-locked"}${active ? " is-active" : ""}`}
        style={nodePosition(`${10 + tier * 15}%`, ROW_TOP[line])} disabled={!unlocked} onClick={() => onSetActive(line, unit.id)}
        title={unlocked ? `${unit.label}${active ? " (출전 중)" : ""}` : `${unit.label} (잠김)`}>
        <strong>{unit.label}</strong><img className={`troop-tree__unit-art${art.isEmblem ? " is-emblem" : ""}${line === "infantry" ? " is-facing-right" : ""}`} src={art.src} alt="" aria-hidden="true" />
        {!unlocked && <em>🔒</em>}
      </button>;
    })}
  </>;
}

function TreeWires() {
  return <svg className="troop-tree__wires" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
    {[200, 430, 660, 890].map((y) => <path key={y} d={`M100 ${y} H850`} />)}
  </svg>;
}
