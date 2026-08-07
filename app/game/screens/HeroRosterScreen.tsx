"use client";

import { useState } from "react";
import { heroArchetype, heroOverallGrade } from "../../../lib/game/hero-definition.ts";
import type { HeroListEntry } from "../../../lib/game/hero-roster.ts";
import { compareByArchetype, compareByGrade, compareByLevel } from "../../../lib/game/hero-roster.ts";
import { Button } from "../Button.tsx";
import { GRADE_COLOR } from "../gradeColors.ts";
import { HeroCard } from "../HeroCard.tsx";
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

// Combined roster + detail screen (2026-08-07, replacing the separate
// list-only HeroRosterScreen + state-heavy HeroDetailScreen): the user
// wanted the hero-select screen's own info card (HeroCard.tsx, extracted
// out of HeroSelectScreen.tsx for this reuse) shown on the left with </>
// to move between heroes, and the roster list on the right - selecting a
// list entry swaps the left card instead of navigating to a separate
// screen. `initialHeroId` seeds which hero the card opens on (a formation
// slot click passes the specific hero; the [영웅] menu button passes null
// and this falls back to the first entry in the current sort order).
// Deployment-priority toggling and the governor label still live on each
// list row exactly as before; item equip/unequip (previously on the old
// HeroDetailScreen) is dropped for now since HeroCard doesn't show it and
// there's no way to acquire items yet anyway (가방 is still a placeholder).
export function HeroRosterScreen({
  entries,
  initialHeroId,
  onBack,
  onToggleDeploymentPriority,
  governorLabelFor,
}: {
  entries: HeroListEntry[];
  initialHeroId: string | null;
  onBack: () => void;
  onToggleDeploymentPriority: (heroId: string) => void;
  governorLabelFor: (state: HeroListEntry["state"]) => string | null;
}) {
  const [sortMode, setSortMode] = useState<SortMode>("grade");
  const [selectedId, setSelectedId] = useState<string | null>(initialHeroId);
  const sorted = [...entries].sort(SORT_COMPARATORS[sortMode]);

  const selectedIndex = sorted.findIndex((entry) => entry.state.heroId === selectedId);
  const selected = selectedIndex >= 0 ? sorted[selectedIndex] : (sorted[0] ?? null);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const goPrev = () => {
    if (activeIndex > 0) setSelectedId(sorted[activeIndex - 1].state.heroId);
  };
  const goNext = () => {
    if (activeIndex < sorted.length - 1) setSelectedId(sorted[activeIndex + 1].state.heroId);
  };

  return (
    <ScreenShell
      header={<h2 className="text-base font-bold text-[#f3dfaa]">영웅</h2>}
      footer={
        <Button size="sm" variant="secondary" onClick={onBack}>
          뒤로
        </Button>
      }
    >
      <div className="flex h-full gap-2 py-1">
        {/* 왼쪽: 영웅선택 화면과 동일한 정보 카드 + </> 이전/다음 */}
        <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
          {selected ? (
            <>
              <div className="flex-1 overflow-y-auto">
                <HeroCard hero={selected.definition} selected />
              </div>
              <div className="flex shrink-0 items-center justify-center gap-3">
                <NavButton direction="prev" onClick={goPrev} disabled={activeIndex <= 0} />
                <span className="text-[10px] text-[#8fa6a8]">
                  {activeIndex + 1} / {sorted.length}
                </span>
                <NavButton direction="next" onClick={goNext} disabled={activeIndex >= sorted.length - 1} />
              </div>
            </>
          ) : (
            <p className="p-2 text-center text-[10px] text-[#8fa6a8]">표시할 영웅이 없습니다.</p>
          )}
        </div>

        {/* 오른쪽: 정렬 버튼 + 영웅 리스트 - 항목을 누르면 왼쪽 카드가 바뀜 */}
        <div className="flex w-40 shrink-0 flex-col gap-1.5 overflow-hidden">
          <div className="flex shrink-0 gap-1">
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
          <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {sorted.length === 0 && <p className="p-2 text-center text-[10px] text-[#8fa6a8]">영웅이 없습니다.</p>}
            {sorted.map(({ state, definition }) => {
              const grade = heroOverallGrade(definition.attributes);
              const archetype = heroArchetype(definition.attributes);
              const governorLabel = governorLabelFor(state);
              const portraitUrl = HERO_PORTRAIT[definition.id];
              const isSelected = state.heroId === (selected?.state.heroId ?? null);
              return (
                <div
                  key={state.heroId}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(state.heroId)}
                  onKeyDown={(event) => event.key === "Enter" && setSelectedId(state.heroId)}
                  className="flex cursor-pointer items-center gap-2 rounded-md p-1.5"
                  style={{ border: `1px solid ${isSelected ? "#d7b765" : "#274049"}`, backgroundColor: "#17343e" }}
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
        </div>
      </div>
    </ScreenShell>
  );
}

function NavButton({ direction, onClick, disabled }: { direction: "prev" | "next"; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "이전 영웅" : "다음 영웅"}
      className="flex shrink-0 items-center justify-center"
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        border: "1px solid #43606a",
        backgroundColor: disabled ? "transparent" : "#17343e",
        backgroundImage: "none",
        color: disabled ? "#3a4f52" : "#8fa6a8",
        fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {direction === "prev" ? "‹" : "›"}
    </button>
  );
}
