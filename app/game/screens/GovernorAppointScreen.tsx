"use client";

import { useState } from "react";
import { heroArchetype, heroOverallGrade } from "../../../lib/game/hero-definition.ts";
import { isHeroEnlistable } from "../../../lib/game/hero.ts";
import type { HeroListEntry } from "../../../lib/game/hero-roster.ts";
import { Button } from "../Button.tsx";
import { ARCHETYPE_LABEL } from "../heroLabels.ts";
import { ScreenShell } from "../ScreenShell.tsx";

const MIN_LENGTH = 2;
const MAX_LENGTH = 12;

// Candidates for the 🎲 button - region/domain-flavored, unlike
// FactionNameScreen's clan-flavored RANDOM_FACTION_NAMES (2026-08-06,
// separate list on purpose - naming a governed world reads differently
// from naming your own faction).
const RANDOM_WORLD_NAMES = [
  "청산평", "녹림곡", "은월령", "황금평야", "적벽촌", "장안벌", "월하촌", "대붕산",
  "용암지대", "빙설령", "천공도", "은하평원", "철벽고원", "적화림", "청화지", "녹수곡",
  "백운산", "흑풍곡", "자소평", "만월도",
];

function randomWorldName(): string {
  return RANDOM_WORLD_NAMES[Math.floor(Math.random() * RANDOM_WORLD_NAMES.length)];
}

// 영주 임명 (task 13, 2026-08-06 lobby redesign direction): pick an idle
// hero to govern a previously-cleared world, and optionally name that
// world (first time only - a name, once set, can't currently be changed
// here). Mirrors HeroEnlistScreen's picker grid (same card layout) but
// single-select instead of multi, plus a name input reusing
// FactionNameScreen's 🎲-randomize pattern with a region-flavored word list.
export function GovernorAppointScreen({
  entries,
  worldLabel,
  existingName,
  onBack,
  onConfirm,
}: {
  entries: HeroListEntry[];
  worldLabel: string;
  existingName: string | null;
  onBack: () => void;
  onConfirm: (heroId: string, name: string) => void;
}) {
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);
  const [name, setName] = useState(existingName ?? "");
  const [diceSpin, setDiceSpin] = useState(0);
  const eligible = entries.filter((entry) => isHeroEnlistable(entry.state));
  const ineligibleCount = entries.length - eligible.length;
  const trimmedName = name.trim();
  const isNameValid = trimmedName.length >= MIN_LENGTH && trimmedName.length <= MAX_LENGTH;
  const canConfirm = selectedHeroId !== null && isNameValid;

  return (
    <ScreenShell
      header={
        <div>
          <h2 className="text-base font-bold text-[#f3dfaa]">영주 임명 - {worldLabel}</h2>
          <p className="text-[10px] text-[#8fa6a8]">이 세계를 다스릴 영웅과 이름을 정하세요.</p>
        </div>
      }
      footer={
        <div className="flex items-center justify-between">
          <Button size="sm" variant="secondary" onClick={onBack}>
            뒤로
          </Button>
          <Button
            size="sm"
            onClick={() => canConfirm && onConfirm(selectedHeroId, trimmedName)}
            disabled={!canConfirm}
          >
            임명하기
          </Button>
        </div>
      }
    >
      <div className="relative mb-2 w-full">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={MAX_LENGTH}
          placeholder={`세계 이름 (${MIN_LENGTH}~${MAX_LENGTH}자)`}
          className="w-full rounded-md border border-[#43606a] bg-[#0b2028] py-2 pr-10 pl-3 text-sm text-[#f3ead4] outline-none focus:border-[#d7b765]"
        />
        <button
          type="button"
          aria-label="세계 이름 무작위 생성"
          onClick={() => {
            setName(randomWorldName());
            setDiceSpin((degrees) => degrees + 360);
          }}
          className="absolute top-1/2 right-0 flex items-center justify-center text-lg leading-none"
          style={{
            width: 40,
            height: 40,
            border: "none",
            borderRadius: 0,
            padding: 0,
            background: "none",
            backgroundImage: "none",
            color: "inherit",
            fontWeight: "normal",
            cursor: "pointer",
            transform: `translateY(-50%) rotate(${diceSpin}deg)`,
            transition: "transform 500ms ease-out",
          }}
        >
          🎲
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5 pb-1">
        {eligible.map(({ state, definition }) => {
          const isSelected = state.heroId === selectedHeroId;
          const grade = heroOverallGrade(definition.attributes);
          const archetype = heroArchetype(definition.attributes);
          return (
            <button
              key={state.heroId}
              onClick={() => setSelectedHeroId(state.heroId)}
              className="flex items-center gap-1.5 rounded p-1.5 text-left"
              style={{
                border: `1px solid ${isSelected ? "#d7b765" : "#43606a"}`,
                backgroundColor: isSelected ? "#1c3b44" : "#17343e",
                backgroundImage: "none",
                fontWeight: 400,
                color: "inherit",
              }}
            >
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
      {eligible.length === 0 && (
        <p className="mt-1 text-[10px] text-[#8fa6a8]">임명할 수 있는 유휴 영웅이 없습니다.</p>
      )}
      {ineligibleCount > 0 && (
        <p className="mt-1 text-[9px] text-[#8fa6a8]">영주 중이거나 회복/출전 중인 영웅 {ineligibleCount}명은 선택할 수 없습니다.</p>
      )}
    </ScreenShell>
  );
}
