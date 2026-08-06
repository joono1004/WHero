"use client";

import { useState } from "react";
import { heroArchetype, heroOverallGrade } from "../../../lib/game/hero-definition.ts";
import type { HeroListEntry } from "../../../lib/game/hero-roster.ts";
import { compareByArchetype, compareByGrade, compareByLevel } from "../../../lib/game/hero-roster.ts";
import { Button } from "../Button.tsx";
import { GRADE_COLOR } from "../gradeColors.ts";
import { ARCHETYPE_LABEL } from "../heroLabels.ts";
import { HERO_PORTRAIT } from "../heroPortraits.ts";
import { ScreenShell } from "../ScreenShell.tsx";

type SortMode = "grade" | "archetype" | "level";

const SORT_COMPARATORS: Record<SortMode, (a: HeroListEntry, b: HeroListEntry) => number> = {
  grade: compareByGrade,
  archetype: compareByArchetype,
  level: compareByLevel,
};

const SORT_LABEL: Record<SortMode, string> = {
  grade: "등급",
  archetype: "유형",
  level: "레벨",
};

// Full hero roster, reached via the lobby's [영웅] menu button (2026-08-06
// menu-bar redesign) - was previously a permanently-docked sidebar list in
// GameLobbyScreen.tsx, moved here so the lobby itself can stay focused on
// world selection (only a compact 5-slot "출전 영웅" formation bar stays
// docked there). Sort + list logic is otherwise unchanged from the old
// sidebar; tapping a hero still hands off to HeroDetailScreen (owned by the
// caller, same as before).
export function HeroRosterScreen({
  entries,
  onBack,
  onSelectHero,
  onToggleDeploymentPriority,
  governorLabelFor,
}: {
  entries: HeroListEntry[];
  onBack: () => void;
  onSelectHero: (heroId: string) => void;
  onToggleDeploymentPriority: (heroId: string) => void;
  governorLabelFor: (state: HeroListEntry["state"]) => string | null;
}) {
  const [sortMode, setSortMode] = useState<SortMode>("grade");
  const sorted = [...entries].sort(SORT_COMPARATORS[sortMode]);

  return (
    <ScreenShell
      header={<h2 className="text-base font-bold text-[#f3dfaa]">영웅</h2>}
      footer={
        <Button size="sm" variant="secondary" onClick={onBack}>
          뒤로
        </Button>
      }
    >
      <div className="flex shrink-0 gap-1 pb-1.5">
        {(Object.keys(SORT_LABEL) as SortMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setSortMode(mode)}
            className="flex-1 text-center"
            style={{
              borderRadius: 4,
              border: `1px solid ${sortMode === mode ? "#d7b765" : "#43606a"}`,
              backgroundColor: sortMode === mode ? "#1c3b44" : "transparent",
              backgroundImage: "none",
              color: sortMode === mode ? "#d7b765" : "#8fa6a8",
              fontWeight: 400,
              padding: "3px 0",
              fontSize: "10px",
            }}
          >
            {SORT_LABEL[mode]}순
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1 pb-1">
        {sorted.length === 0 && <p className="p-2 text-center text-[10px] text-[#8fa6a8]">영웅이 없습니다.</p>}
        {sorted.map(({ state, definition }) => {
          const grade = heroOverallGrade(definition.attributes);
          const archetype = heroArchetype(definition.attributes);
          const governorLabel = governorLabelFor(state);
          const portraitUrl = HERO_PORTRAIT[definition.id];
          return (
            <div
              key={state.heroId}
              role="button"
              tabIndex={0}
              onClick={() => onSelectHero(state.heroId)}
              onKeyDown={(event) => event.key === "Enter" && onSelectHero(state.heroId)}
              className="flex cursor-pointer items-center gap-2 rounded-md p-1.5"
              style={{ border: "1px solid #274049", backgroundColor: "#17343e" }}
            >
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleDeploymentPriority(state.heroId);
                }}
                title="출전 우선 표시"
                className="shrink-0"
                style={{
                  border: "none",
                  background: "none",
                  backgroundImage: "none",
                  padding: 0,
                  fontSize: "14px",
                  color: state.deploymentPriority ? "#d7b765" : "#43606a",
                }}
              >
                {state.deploymentPriority ? "★" : "☆"}
              </button>
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full"
                style={{
                  border: `2px solid ${GRADE_COLOR[grade]}`,
                  backgroundColor: "#0b2028",
                  boxShadow: `0 0 6px ${GRADE_COLOR[grade]}77`,
                }}
              >
                {portraitUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local /public asset, same convention as HeroSelectScreen.tsx
                  <img src={portraitUrl} alt={`${definition.name} 초상`} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-base text-[#43606a]">🧑</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-[#f3dfaa]">{definition.name}</p>
                <p className="truncate text-[10px] text-[#8fa6a8]">
                  {grade}급 · {ARCHETYPE_LABEL[archetype]} · Lv.{state.level}
                </p>
                {governorLabel && <p className="truncate text-[10px] text-[#d9bd74]">{governorLabel}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </ScreenShell>
  );
}
