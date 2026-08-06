"use client";

import { useState } from "react";
import { heroArchetype, heroOverallGrade } from "../../../lib/game/hero-definition.ts";
import type { HeroDefinition } from "../../../lib/game/hero-definition.ts";
import type { CoreGrade } from "../../../lib/game/grade.ts";
import { HERO_TRAIT_CATALOG, MAX_HERO_TRAITS } from "../../../lib/game/hero-trait.ts";
import type { HeroId } from "../../../lib/game/ids.ts";
import { STARTING_HEROES } from "../../../lib/game/starting-heroes.ts";
import { Button } from "../Button.tsx";
import { ARCHETYPE_LABEL, UNIT_TYPE_LABEL } from "../heroLabels.ts";
import { ScreenShell } from "../ScreenShell.tsx";

// Filled in as Codex delivers each hero's art (public/art/heroes/) - a
// hero with no entry here still gets the plain placeholder box below.
const HERO_PORTRAIT: Partial<Record<HeroId, string>> = {
  "wei-yan": "/art/heroes/wei-yan-classic-portrait-v3.webp",
};

// No grade-color convention existed anywhere in the codebase yet (Codex's
// lib/world/prototype/faction-visual.ts explicitly notes "hero grade
// colours remain separate" without defining them) - standard low-to-high
// RPG rarity ladder: gray -> green -> blue -> purple -> gold -> orange-red.
const GRADE_COLOR: Record<CoreGrade, string> = {
  D: "#9aa5a3",
  C: "#7bc47f",
  B: "#6ea8e0",
  A: "#b98cf0",
  S: "#f0c419",
  SS: "#ff6b57",
};

export function HeroSelectScreen({
  onConfirm,
  onBack,
}: {
  onConfirm: (heroId: string) => void;
  onBack: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <ScreenShell
      header={<h2 className="text-lg font-bold text-[#f3dfaa]">영웅을 선택하세요</h2>}
      footer={
        <div className="flex justify-center gap-3">
          <Button variant="secondary" size="sm" onClick={onBack}>
            뒤로
          </Button>
          <Button size="sm" onClick={() => selectedId && onConfirm(selectedId)} disabled={!selectedId}>
            이 영웅으로 시작
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-2 pb-1">
        {STARTING_HEROES.map((hero) => (
          <HeroCard
            key={hero.id}
            hero={hero}
            selected={hero.id === selectedId}
            onSelect={() => setSelectedId(hero.id)}
          />
        ))}
      </div>
    </ScreenShell>
  );
}

function HeroCard({
  hero,
  selected,
  onSelect,
}: {
  hero: HeroDefinition;
  selected: boolean;
  onSelect: () => void;
}) {
  const grade = heroOverallGrade(hero.attributes);
  const archetype = heroArchetype(hero.attributes);

  return (
    <button
      onClick={onSelect}
      className="text-left transition-colors"
      style={{
        borderRadius: 8,
        border: `1px solid ${selected ? "#d7b765" : "#43606a"}`,
        backgroundColor: selected ? "#1c3b44" : "#17343e",
        backgroundImage: "none",
        padding: "0.45rem 0.7rem 0.55rem",
        fontWeight: 400,
        color: "inherit",
      }}
    >
      <div className="flex items-center justify-between gap-1">
        {/* Name + grade·archetype badge grouped together on the left (was
            split name-left/badge-right) - 병과 now takes the right side of
            this row instead, since it doesn't fit landing beside 매력 in
            the stat grid without truncating (2026-08-xx). */}
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="shrink-0 text-base font-bold text-[#f3dfaa]">{hero.name}</h3>
          <span
            className="whitespace-nowrap rounded border px-1.5 py-0.5 text-xs font-bold"
            style={{ borderColor: GRADE_COLOR[grade], color: GRADE_COLOR[grade] }}
          >
            {grade}급·{ARCHETYPE_LABEL[archetype]}
          </span>
        </div>
        <span className="whitespace-nowrap text-xs">
          <span className="text-[#8fa6a8]">병과 </span>
          <span className="font-bold text-[#e3ce94]">{UNIT_TYPE_LABEL[hero.unitType]}</span>
        </span>
      </div>

      <div className="mt-1.5 flex items-stretch gap-2">
        {/* Reserved for Codex's hero portrait art (see HERO_PORTRAIT) - a
            hero without an entry yet falls back to a plain placeholder.
            Stretches to match the stat block's height via items-stretch. */}
        <div
          className="flex shrink-0 items-center justify-center overflow-hidden rounded"
          style={{ width: 96, border: "1px solid #43606a", backgroundColor: "#0b2028" }}
        >
          {HERO_PORTRAIT[hero.id] ? (
            // eslint-disable-next-line @next/next/no-img-element -- local /public asset, same convention as components/world/TestHeroPanel.tsx
            <img
              src={HERO_PORTRAIT[hero.id]}
              alt={`${hero.name} 초상`}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-4xl text-[#43606a]">🧑</span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 items-center py-0.5">
          <dl className="grid w-full grid-cols-2 gap-x-2 gap-y-1.5 text-sm">
            <GradeStat label="통솔" grade={hero.attributes.leadership} />
            <GradeStat label="무력" grade={hero.attributes.force} />
            <GradeStat label="지력" grade={hero.attributes.intelligence} />
            <GradeStat label="체력" grade={hero.attributes.vitality} />
            <GradeStat label="매력" grade={hero.attributes.charisma} />
          </dl>
        </div>
      </div>

      <div className="mt-1.5">
        <p className="text-xs font-bold text-[#8fa6a8]">특기</p>
        <div className="mt-1 flex gap-1">
          {/* Fixed MAX_HERO_TRAITS slots, always all shown - a hero with
              fewer traits than the max just shows locked slots after their
              earned ones, so the row's length telegraphs "how much growth
              room is left" rather than only ever showing what's owned. */}
          {Array.from({ length: MAX_HERO_TRAITS }, (_, index) => hero.traits[index]).map((traitId, index) => (
            <div
              key={index}
              className="flex flex-1 items-center justify-center rounded border py-1 text-xs font-bold"
              style={{
                borderColor: traitId ? "#6ea8e0" : "#3a4f52",
                backgroundColor: traitId ? "rgba(110,168,224,0.1)" : "transparent",
                color: traitId ? "#e3ce94" : "#5c7276",
              }}
            >
              {traitId ? HERO_TRAIT_CATALOG[traitId].name : "🔒"}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-[#c0cbc7]">{hero.description}</p>
    </button>
  );
}

// Grade letters (D/C/B/A/S/SS) get their own component rather than reusing
// a generic label/value layout: the value sits in a flex-1 slot after the
// label and is text-center within it, so it's centered in the remaining
// row width (not hugging the row's right edge the way justify-between
// would) and colored by GRADE_COLOR instead of a flat gold.
function GradeStat({ label, grade }: { label: string; grade: CoreGrade }) {
  return (
    <div className="flex items-center gap-1">
      <span className="shrink-0 text-[#8fa6a8]">{label}</span>
      <span className="flex-1 text-center font-bold" style={{ color: GRADE_COLOR[grade] }}>
        {grade}
      </span>
    </div>
  );
}
