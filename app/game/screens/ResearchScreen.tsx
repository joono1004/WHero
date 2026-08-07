import type { Faction } from "../../../lib/game/faction.ts";
import type { UnitTypeId } from "../../../lib/game/ids.ts";
import { canAffordResearch, researchUpgradeCost } from "../../../lib/game/research.ts";
import type { EconomyResearchKind } from "../../../lib/game/research.ts";
import {
  canEvolveUnitType,
  isUnitTypeUnlockedFor,
  troopGrade,
  troopLevel,
  troopUpgradeCost,
  unitEvolutionBlockedReason,
} from "../../../lib/game/unit-evolution.ts";
import { MAX_TROOP_TIER, TROOP_LINES, unitTypesInLine } from "../../../lib/game/unit-production.ts";
import type { TroopLine } from "../../../lib/game/unit-production.ts";
import { Button } from "../Button.tsx";
import { ECONOMY_RESEARCH_CATEGORIES, RESEARCH_LABEL, TROOP_LINE_LABEL, TROOP_TIER_LABEL } from "../researchLabels.ts";
import { ScreenShell } from "../ScreenShell.tsx";

// 2026-08-08 (사용자 방향): 연구 화면은 레벨업/진화(해금)만 담당한다 -
// "지금 출전할 병과를 고르는" 것은 병사 화면(TroopsScreen)의 몫으로
// 옮겨감. 좌측에 계열, 우측으로 갈수록 진화 단계(기본~5단계)가 이어지는
// 표 형태로 병사 화면과 레이아웃을 맞춤 - 병사 화면과 달리 여기 칸은
// 레벨업/진화 버튼을 담고 있어서 조금 더 큼.
const LABEL_COLUMN_PX = 56;
const TIER_COLUMN_PX = 104;

export function ResearchScreen({
  faction,
  onBack,
  onUpgradeEconomy,
  onUpgradeTroop,
  onEvolve,
}: {
  faction: Faction;
  onBack: () => void;
  onUpgradeEconomy: (category: EconomyResearchKind) => void;
  onUpgradeTroop: (unitType: UnitTypeId) => void;
  onEvolve: (unitType: UnitTypeId) => void;
}) {
  const { research, resources } = faction;
  const gridTemplateColumns = `${LABEL_COLUMN_PX}px repeat(${MAX_TROOP_TIER + 1}, ${TIER_COLUMN_PX}px)`;
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
          <div className="overflow-x-auto">
            <div className="grid gap-y-1.5" style={{ gridTemplateColumns }}>
              <div />
              {TROOP_TIER_LABEL.map((label) => (
                <div key={label} className="px-1 text-center text-[9px] font-bold text-[#8fa6a8]">
                  {label}
                </div>
              ))}
              {TROOP_LINES.map((line) => (
                <TroopLineRow key={line} line={line} faction={faction} onUpgradeTroop={onUpgradeTroop} onEvolve={onEvolve} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </ScreenShell>
  );
}

function TroopLineRow({
  line,
  faction,
  onUpgradeTroop,
  onEvolve,
}: {
  line: TroopLine;
  faction: Faction;
  onUpgradeTroop: (unitType: UnitTypeId) => void;
  onEvolve: (unitType: UnitTypeId) => void;
}) {
  return (
    <>
      <div className="flex items-center text-[11px] font-bold text-[#e3ce94]">{TROOP_LINE_LABEL[line]}</div>
      {unitTypesInLine(line).map((node) => {
        const unlocked = isUnitTypeUnlockedFor(faction, node.id);
        const level = troopLevel(faction.troopLevels, node.id);
        const grade = troopGrade(faction.troopLevels, node.id);
        const levelCost = troopUpgradeCost(faction.troopLevels, node.id);
        const levelAffordable = levelCost ? canAffordResearch(faction.resources, levelCost) : false;
        const evolveBlockedReason = unlocked ? null : unitEvolutionBlockedReason(faction, node.id);
        const evolvable = unlocked ? false : canEvolveUnitType(faction, node.id);
        return (
          <div
            key={node.id}
            className={`flex flex-col items-center gap-0.5 rounded border px-1 py-1.5 text-center text-[10px] ${
              unlocked ? "border-[#2c4750] bg-[#122a32]" : "border-[#233c44] bg-[#122a32]/40"
            }`}
          >
            <span className={unlocked ? "text-[#c0cbc7]" : "text-[#5f7378]"}>{unlocked ? node.label : `🔒 ${node.label}`}</span>
            {unlocked ? (
              <span className="text-[9px] text-[#8fa6a8]">
                {grade}등급 Lv.{level}
              </span>
            ) : (
              node.unlock && (
                <span className="text-[9px] text-[#8fa6a8]">
                  금{node.unlock.gold}·유산{node.unlock.researchResource}
                  {node.unlock.requiredItemId ? " ·아이템" : ""}
                </span>
              )
            )}
            {unlocked ? (
              <Button size="sm" disabled={!levelCost || !levelAffordable} onClick={() => onUpgradeTroop(node.id)}>
                연구
              </Button>
            ) : (
              node.unlock && (
                <Button size="sm" disabled={!evolvable} onClick={() => onEvolve(node.id)}>
                  진화
                </Button>
              )
            )}
            {!unlocked && evolveBlockedReason && <span className="text-[8px] text-[#5f7378]">{evolveBlockedReason}</span>}
          </div>
        );
      })}
    </>
  );
}
