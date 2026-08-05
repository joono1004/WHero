"use client";

import { useState } from "react";
import { heroArchetype, heroOverallGrade } from "../../../lib/game/hero-definition.ts";
import { isHeroEnlistable } from "../../../lib/game/hero.ts";
import type { HeroListEntry } from "../../../lib/game/hero-roster.ts";
import { MAX_ENLISTED_HEROES } from "../../../lib/game/world-entry.ts";
import { Button } from "../Button.tsx";
import { ARCHETYPE_LABEL } from "../heroLabels.ts";
import { ScreenShell } from "../ScreenShell.tsx";

// Shown after picking a map candidate card, before entering it (task 10,
// this session's direction - point 8): the player enlists up to 5 heroes
// for the campaign. Only the first (in the order clicked) starts on the
// map - the rest wait in HeroAssignment's "enlisted" mode until the
// faction's city count catches up (city-actions.ts's checkHeroSummons).
// Order matters, so selection is tracked as an array, not a set, and shown
// with a numbered badge.
export function HeroEnlistScreen({
  entries,
  onBack,
  onConfirm,
}: {
  entries: HeroListEntry[];
  onBack: () => void;
  onConfirm: (enlistedHeroIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const eligible = entries.filter((entry) => isHeroEnlistable(entry.state));
  const ineligibleCount = entries.length - eligible.length;

  const toggle = (heroId: string) => {
    setSelected((current) => {
      if (current.includes(heroId)) return current.filter((id) => id !== heroId);
      if (current.length >= MAX_ENLISTED_HEROES) return current;
      return [...current, heroId];
    });
  };

  return (
    <ScreenShell
      header={
        <div>
          <h2 className="text-base font-bold text-[#f3dfaa]">출전할 영웅 선택</h2>
          <p className="text-[10px] text-[#8fa6a8]">
            최대 {MAX_ENLISTED_HEROES}명까지 선택 - 선택 순서대로 도시를 세울 때마다 소환됩니다 ({selected.length}/
            {MAX_ENLISTED_HEROES})
          </p>
        </div>
      }
      footer={
        <div className="flex items-center justify-between">
          <Button size="sm" variant="secondary" onClick={onBack}>
            뒤로
          </Button>
          <Button size="sm" onClick={() => selected.length > 0 && onConfirm(selected)} disabled={selected.length === 0}>
            이 영웅들로 진출
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-1.5 pb-1">
        {eligible.map(({ state, definition }) => {
          const order = selected.indexOf(state.heroId);
          const isSelected = order !== -1;
          const grade = heroOverallGrade(definition.attributes);
          const archetype = heroArchetype(definition.attributes);
          return (
            <button
              key={state.heroId}
              onClick={() => toggle(state.heroId)}
              className="relative flex items-center gap-1.5 rounded p-1.5 text-left"
              style={{
                border: `1px solid ${isSelected ? "#d7b765" : "#43606a"}`,
                backgroundColor: isSelected ? "#1c3b44" : "#17343e",
                backgroundImage: "none",
                fontWeight: 400,
                color: "inherit",
              }}
            >
              {isSelected && (
                <span
                  className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
                  style={{ backgroundColor: "#d7b765", color: "#102027" }}
                >
                  {order + 1}
                </span>
              )}
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ border: "1px solid #43606a", backgroundColor: "#0b2028", color: "#d7b765" }}
              >
                {definition.name.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-bold text-[#f3dfaa]">{definition.name}</p>
                <p className="truncate text-[9px] text-[#8fa6a8]">
                  {grade}급 · {ARCHETYPE_LABEL[archetype]} · Lv.{state.level}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      {ineligibleCount > 0 && (
        <p className="mt-1 text-[9px] text-[#8fa6a8]">영주 중이거나 회복 중인 영웅 {ineligibleCount}명은 선택할 수 없습니다.</p>
      )}
    </ScreenShell>
  );
}
