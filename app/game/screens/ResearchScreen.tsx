import type { Faction } from "../../../lib/game/faction.ts";
import type { UnitTypeId } from "../../../lib/game/ids.ts";
import { canAffordResearch, researchUpgradeCost } from "../../../lib/game/research.ts";
import type { EconomyResearchKind } from "../../../lib/game/research.ts";
import {
  activeEvolutionFor,
  canEvolveUnitType,
  isUnitTypeUnlockedFor,
  troopGrade,
  troopLevel,
  troopUpgradeCost,
  unitEvolutionBlockedReason,
} from "../../../lib/game/unit-evolution.ts";
import { TROOP_LINES, unitTypesInLine } from "../../../lib/game/unit-production.ts";
import type { TroopLine } from "../../../lib/game/unit-production.ts";
import { Button } from "../Button.tsx";
import { ECONOMY_RESEARCH_CATEGORIES, RESEARCH_LABEL, TROOP_LINE_LABEL } from "../researchLabels.ts";
import { ScreenShell } from "../ScreenShell.tsx";

export function ResearchScreen({
  faction,
  onBack,
  onUpgradeEconomy,
  onUpgradeTroop,
  onEvolve,
  onSetActive,
}: {
  faction: Faction;
  onBack: () => void;
  onUpgradeEconomy: (category: EconomyResearchKind) => void;
  onUpgradeTroop: (unitType: UnitTypeId) => void;
  onEvolve: (unitType: UnitTypeId) => void;
  onSetActive: (line: TroopLine, unitType: UnitTypeId) => void;
}) {
  const { research, resources } = faction;
  return (
    <ScreenShell
      header={
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#f3dfaa]">연구</h2>
          <span className="text-[10px] text-[#8fa6a8]">
            금 {resources.gold} · 유산 {resources.researchResource}
          </span>
        </div>
      }
      footer={
        <div className="flex justify-center">
          <Button variant="secondary" size="sm" onClick={onBack}>
            뒤로
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-2 pb-1">
        <section className="rounded-md border border-[#43606a] bg-[#17343e] p-2">
          <h3 className="mb-1 text-[10px] font-bold text-[#8fa6a8]">내정</h3>
          <div className="flex flex-col gap-1.5">
            {ECONOMY_RESEARCH_CATEGORIES.map((category) => {
              const level = research[category];
              const cost = researchUpgradeCost(level);
              const affordable = cost ? canAffordResearch(resources, cost) : false;
              return (
                <div key={category} className="flex items-center justify-between text-[11px]">
                  <div>
                    <p className="text-[#c0cbc7]">
                      {RESEARCH_LABEL[category]} <span className="font-bold text-[#e3ce94]">Lv.{level}</span>
                      {cost ? "" : ` (최대)`}
                    </p>
                    {cost && (
                      <p className="text-[9px] text-[#8fa6a8]">
                        다음: 금 {cost.gold} · 유산 {cost.researchResource}
                      </p>
                    )}
                  </div>
                  <Button size="sm" disabled={!cost || !affordable} onClick={() => onUpgradeEconomy(category)}>
                    연구
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-md border border-[#43606a] bg-[#17343e] p-2">
          <h3 className="mb-1 text-[10px] font-bold text-[#8fa6a8]">병과 진화</h3>
          <div className="flex flex-col gap-2">
            {TROOP_LINES.map((line) => (
              <TroopLineGroup
                key={line}
                line={line}
                faction={faction}
                onUpgradeTroop={onUpgradeTroop}
                onEvolve={onEvolve}
                onSetActive={onSetActive}
              />
            ))}
          </div>
        </section>
      </div>
    </ScreenShell>
  );
}

function TroopLineGroup({
  line,
  faction,
  onUpgradeTroop,
  onEvolve,
  onSetActive,
}: {
  line: TroopLine;
  faction: Faction;
  onUpgradeTroop: (unitType: UnitTypeId) => void;
  onEvolve: (unitType: UnitTypeId) => void;
  onSetActive: (line: TroopLine, unitType: UnitTypeId) => void;
}) {
  const activeUnitType = activeEvolutionFor(faction, line);
  return (
    <div className="rounded border border-[#2c4750] bg-[#122a32] p-1.5">
      <p className="mb-1 text-[10px] font-bold text-[#8fa6a8]">{TROOP_LINE_LABEL[line]}</p>
      <div className="flex flex-col gap-1">
        {unitTypesInLine(line).map((node) => {
          const unlocked = isUnitTypeUnlockedFor(faction, node.id);
          const isActive = node.id === activeUnitType;
          const level = troopLevel(faction.troopLevels, node.id);
          const grade = troopGrade(faction.troopLevels, node.id);
          const levelCost = troopUpgradeCost(faction.troopLevels, node.id);
          const levelAffordable = levelCost ? canAffordResearch(faction.resources, levelCost) : false;
          const evolveBlockedReason = unlocked ? null : unitEvolutionBlockedReason(faction, node.id);
          const evolvable = unlocked ? false : canEvolveUnitType(faction, node.id);
          return (
            <div key={node.id} className="flex items-center justify-between text-[11px]">
              <div>
                <p className={isActive ? "font-bold text-[#e3ce94]" : "text-[#c0cbc7]"}>
                  {node.label}
                  {isActive ? " (출전)" : ""}
                  {unlocked && <span className="ml-1 text-[#8fa6a8]">{grade}등급 Lv.{level}</span>}
                  {!unlocked && node.unlock && (
                    <span className="ml-1 text-[#8fa6a8]">
                      해금: 금 {node.unlock.gold} · 유산 {node.unlock.researchResource}
                      {node.unlock.requiredItemId ? ` · 아이템 필요` : ""}
                    </span>
                  )}
                </p>
                {!unlocked && evolveBlockedReason && (
                  <p className="text-[9px] text-[#8fa6a8]">{evolveBlockedReason}</p>
                )}
              </div>
              <div className="flex gap-1">
                {unlocked && (
                  <Button size="sm" disabled={!levelCost || !levelAffordable} onClick={() => onUpgradeTroop(node.id)}>
                    연구
                  </Button>
                )}
                {unlocked && !isActive && (
                  <Button size="sm" variant="secondary" onClick={() => onSetActive(line, node.id)}>
                    출전
                  </Button>
                )}
                {!unlocked && node.unlock && (
                  <Button size="sm" disabled={!evolvable} onClick={() => onEvolve(node.id)}>
                    진화
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
