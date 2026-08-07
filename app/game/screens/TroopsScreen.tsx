import type { CSSProperties } from "react";
import type { Faction } from "../../../lib/game/faction.ts";
import type { UnitTypeId } from "../../../lib/game/ids.ts";
import { activeEvolutionFor, isUnitTypeUnlockedFor, troopGrade, troopLevel } from "../../../lib/game/unit-evolution.ts";
import { MAX_TROOP_TIER, TROOP_LINES, unitTypesInLine } from "../../../lib/game/unit-production.ts";
import type { TroopLine } from "../../../lib/game/unit-production.ts";
import { Button } from "../Button.tsx";
import { TROOP_LINE_LABEL, TROOP_TIER_LABEL } from "../researchLabels.ts";
import { ScreenShell } from "../ScreenShell.tsx";

// 병사 화면 (2026-08-08, 사용자 방향): 연구 화면(ResearchScreen)이
// 레벨업/진화(해금)를 담당하는 것과 분리해, 여기는 "지금 해금된 병과 중
// 어떤 걸 출전시킬지 고르는" 용도만 담당한다. 좌측에 계열(보병/궁병/기병/
// 책사), 우측으로 갈수록 진화 단계(기본~5단계)가 이어지는 표 형태 -
// 사용자가 준 예시("보병 - 검병 - 산악병 - ...") 그대로. 해금 안 된
// 단계도 함께 보여주되(뭘 향해 크는지 알 수 있게) 지금은 클릭해도 아무
// 반응이 없다 - 클릭 시 연구 화면으로 넘어가 바로 해금할 수 있게 하는
// 기능은 사용자가 명시적으로 "나중에 추가" 대상으로 남겨둠. 분기(같은
// 단계에 여러 후보)도 마찬가지로 "나중에 추가" - 지금은 계열당 한 칸씩
// 외길.
const LABEL_COLUMN_PX = 56;
const TIER_COLUMN_PX = 92;

// app/globals.css has a bare, unlayered `button { background:linear-
// gradient(...); border:...; padding:...; ... }` rule that beats ANY
// Tailwind class on a raw <button> regardless of specificity (cascade
// layers - see Button.tsx's comment for the full explanation). These grid
// cells are custom multi-line buttons, not the shared Button component, so
// every property that global rule touches (border/border-radius/padding/
// background/color/font-weight/cursor) has to be set inline here instead
// of via className to actually take effect.
function cellStyle(unlocked: boolean, isActive: boolean): CSSProperties {
  if (!unlocked) {
    return {
      border: "1px solid #233c44",
      borderRadius: 4,
      padding: "6px 4px",
      background: "none",
      backgroundColor: "rgba(18, 42, 50, 0.4)",
      color: "#5f7378",
      fontWeight: 400,
      cursor: "default",
    };
  }
  if (isActive) {
    return {
      border: "1px solid #e3ce94",
      borderRadius: 4,
      padding: "6px 4px",
      background: "none",
      backgroundColor: "#2a4a3a",
      color: "#e3ce94",
      fontWeight: 700,
      cursor: "pointer",
    };
  }
  return {
    border: "1px solid #2c4750",
    borderRadius: 4,
    padding: "6px 4px",
    background: "none",
    backgroundColor: "#122a32",
    color: "#c0cbc7",
    fontWeight: 400,
    cursor: "pointer",
  };
}

export function TroopsScreen({
  faction,
  onBack,
  onSetActive,
}: {
  faction: Faction;
  onBack: () => void;
  onSetActive: (line: TroopLine, unitType: UnitTypeId) => void;
}) {
  const gridTemplateColumns = `${LABEL_COLUMN_PX}px repeat(${MAX_TROOP_TIER + 1}, ${TIER_COLUMN_PX}px)`;
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
      <div className="overflow-x-auto pb-1">
        <div className="grid gap-y-1.5" style={{ gridTemplateColumns }}>
          <div />
          {TROOP_TIER_LABEL.map((label) => (
            <div key={label} className="px-1 text-center text-[9px] font-bold text-[#8fa6a8]">
              {label}
            </div>
          ))}
          {TROOP_LINES.map((line) => (
            <TroopLineRow key={line} line={line} faction={faction} onSetActive={onSetActive} />
          ))}
        </div>
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
    <>
      <div className="flex items-center text-[11px] font-bold text-[#e3ce94]">{TROOP_LINE_LABEL[line]}</div>
      {unitTypesInLine(line).map((node) => {
        const unlocked = isUnitTypeUnlockedFor(faction, node.id);
        const isActive = node.id === activeUnitType;
        const level = troopLevel(faction.troopLevels, node.id);
        const grade = troopGrade(faction.troopLevels, node.id);
        return (
          <button
            key={node.id}
            type="button"
            disabled={!unlocked}
            onClick={() => onSetActive(line, node.id)}
            className="flex flex-col items-center justify-center gap-0.5 text-[10px]"
            style={cellStyle(unlocked, isActive)}
          >
            <span>{unlocked ? node.label : `🔒 ${node.label}`}</span>
            {unlocked && (
              <span className="text-[9px]" style={{ color: "#8fa6a8", fontWeight: 400 }}>
                {grade}등급 Lv.{level}
              </span>
            )}
            {isActive && <span className="text-[9px]">출전 중</span>}
          </button>
        );
      })}
    </>
  );
}
