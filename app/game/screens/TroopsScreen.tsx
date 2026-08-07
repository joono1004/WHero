import type { Faction } from "../../../lib/game/faction.ts";
import type { UnitTypeId } from "../../../lib/game/ids.ts";
import { activeEvolutionFor, isUnitTypeUnlockedFor, troopGrade, troopLevel } from "../../../lib/game/unit-evolution.ts";
import { TROOP_LINES, unitTypesInLine } from "../../../lib/game/unit-production.ts";
import type { TroopLine } from "../../../lib/game/unit-production.ts";
import { Button } from "../Button.tsx";
import { TROOP_LINE_LABEL } from "../researchLabels.ts";
import { ScreenShell } from "../ScreenShell.tsx";

// 병사 화면 (2026-08-08, 사용자 방향): 연구 화면(ResearchScreen)이
// 레벨업/진화(해금)를 담당하는 것과 분리해, 여기는 "지금 해금된 병과 중
// 어떤 걸 출전시킬지 고르는" 용도만 담당한다. 해금 안 된 병과도 함께
// 보여주되(뭘 향해 크는지 알 수 있게), 지금은 클릭해도 아무 반응이
// 없다 - 클릭 시 연구 화면으로 넘어가 바로 해금할 수 있게 하는 기능은
// 사용자가 명시적으로 "나중에 추가" 대상으로 남겨둠.
export function TroopsScreen({
  faction,
  onBack,
  onSetActive,
}: {
  faction: Faction;
  onBack: () => void;
  onSetActive: (line: TroopLine, unitType: UnitTypeId) => void;
}) {
  return (
    <ScreenShell
      header={<h2 className="text-base font-bold text-[#f3dfaa]">병사</h2>}
      footer={
        <div className="flex justify-center">
          <Button variant="secondary" size="sm" onClick={onBack}>
            뒤로
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-2 pb-1">
        {TROOP_LINES.map((line) => (
          <TroopLineRow key={line} line={line} faction={faction} onSetActive={onSetActive} />
        ))}
      </div>
    </ScreenShell>
  );
}

function TroopLineRow({
  line,
  faction,
  onSetActive,
}: {
  line: TroopLine;
  faction: Faction;
  onSetActive: (line: TroopLine, unitType: UnitTypeId) => void;
}) {
  const activeUnitType = activeEvolutionFor(faction, line);
  return (
    <section className="rounded-md border border-[#43606a] bg-[#17343e] p-2">
      <h3 className="mb-1 text-[10px] font-bold text-[#8fa6a8]">{TROOP_LINE_LABEL[line]}</h3>
      <div className="flex flex-col gap-1">
        {unitTypesInLine(line).map((node) => {
          const unlocked = isUnitTypeUnlockedFor(faction, node.id);
          const isActive = node.id === activeUnitType;
          const level = troopLevel(faction.troopLevels, node.id);
          const grade = troopGrade(faction.troopLevels, node.id);
          return (
            <div
              key={node.id}
              className={`flex items-center justify-between rounded px-1.5 py-1 text-[11px] ${
                unlocked ? "bg-[#122a32]" : "bg-[#122a32]/40"
              }`}
            >
              <p className={unlocked ? (isActive ? "font-bold text-[#e3ce94]" : "text-[#c0cbc7]") : "text-[#5f7378]"}>
                {unlocked ? "" : "🔒 "}
                {node.label}
                {unlocked && <span className="ml-1 text-[#8fa6a8]">{grade}등급 Lv.{level}</span>}
              </p>
              {unlocked &&
                (isActive ? (
                  <span className="text-[10px] font-bold text-[#e3ce94]">출전 중</span>
                ) : (
                  <Button size="sm" onClick={() => onSetActive(line, node.id)}>
                    출전
                  </Button>
                ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
