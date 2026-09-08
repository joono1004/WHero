import type { CSSProperties } from "react";
import type { Faction } from "../../../lib/game/faction.ts";
import type { UnitTypeId } from "../../../lib/game/ids.ts";
import { activeEvolutionFor, isUnitTypeUnlockedFor } from "../../../lib/game/unit-evolution.ts";
import { unitTypesInLine } from "../../../lib/game/unit-production.ts";
import type { TroopLine } from "../../../lib/game/unit-production.ts";
import { TROOP_LINE_LABEL } from "../researchLabels.ts";

// 캐릭터 아트가 준비되면 TroopIcon의 문자 아이콘만 실제 스프라이트로 교체한다.
const TREE_LINES: TroopLine[] = ["infantry", "cavalry", "archer", "strategist"];
const GRADE_BY_TIER = ["D", "C", "B", "A", "S", "SS"];
const ROW_TOP: Record<TroopLine, string> = { infantry: "13%", cavalry: "37%", archer: "61%", strategist: "85%" };
const ICON_BY_LINE: Record<TroopLine, string> = { infantry: "⚔", cavalry: "♞", archer: "🏹", strategist: "☯" };

type CombinationMock = { name: string; grade: string; condition: string; left: string; top: string; icon: string };
const COMBINATION_MOCKS: CombinationMock[] = [
  { name: "석궁기병", grade: "B", condition: "석궁병 + 기병", left: "40%", top: "49%", icon: "♞" },
  { name: "화공대", grade: "A", condition: "검병 + 군사", left: "55%", top: "74%", icon: "✹" },
  { name: "전차대", grade: "S", condition: "중보병 + 창기병", left: "70%", top: "25%", icon: "▰" },
];

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
        <div className="troop-tree__legend" aria-hidden="true">
          <span><i className="troop-tree__legend-dot troop-tree__legend-dot--active" />출전</span>
          <span><i className="troop-tree__legend-dot" />활성</span>
          <span><i className="troop-tree__legend-dot troop-tree__legend-dot--locked" />잠김</span>
          <b>조합 병과는 두 병과 해금 뒤 편성 가능</b>
        </div>
        <div className="troop-tree__stage">
          <TreeWires />
          <div className="troop-tree__grades" aria-hidden="true">
            {GRADE_BY_TIER.map((grade, index) => <span key={grade} style={{ left: `${10 + index * 15}%` }}>{grade}</span>)}
          </div>
          {TREE_LINES.map((line) => <TroopLineBranch key={line} line={line} faction={faction} onSetActive={onSetActive} />)}
          {COMBINATION_MOCKS.map((combination) => (
            <div key={combination.name} className="troop-tree__combo" style={nodePosition(combination.left, combination.top)} title={`${combination.condition} 조합으로 편성`}>
              <span className="troop-tree__combo-icon">{combination.icon}</span><span className="troop-tree__combo-grade">{combination.grade}</span>
              <strong>{combination.name}</strong><small>{combination.condition}</small><em>🔒 조합</em>
            </div>
          ))}
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
      return <button key={unit.id} type="button" className={`troop-tree__node${unlocked ? "" : " is-locked"}${active ? " is-active" : ""}`}
        style={nodePosition(`${10 + tier * 15}%`, ROW_TOP[line])} disabled={!unlocked} onClick={() => onSetActive(line, unit.id)}
        title={unlocked ? `${unit.label}${active ? " (출전 중)" : ""}` : `${unit.label} (잠김)`}>
        <span className="troop-tree__unit-icon" aria-hidden="true">{ICON_BY_LINE[line]}</span><span className="troop-tree__node-grade">{GRADE_BY_TIER[tier]}</span>
        <strong>{unit.label}</strong>{active ? <em>출전</em> : unlocked ? <small>대기</small> : <em>🔒</em>}
      </button>;
    })}
  </>;
}

function TreeWires() {
  return <svg className="troop-tree__wires" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
    {[130, 370, 610, 850].map((y) => <path key={y} d={`M100 ${y} H850`} />)}
    <path className="troop-tree__wire--combo" d="M250 610 L400 490 L400 370" />
    <path className="troop-tree__wire--combo" d="M250 130 L550 740 L400 850" />
    <path className="troop-tree__wire--combo" d="M550 130 L700 250 L550 370" />
  </svg>;
}
