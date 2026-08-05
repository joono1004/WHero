"use client";

import { useState } from "react";
import { heroArchetype, heroOverallGrade } from "../../../lib/game/hero-definition.ts";
import type { HeroDefinition } from "../../../lib/game/hero-definition.ts";
import type { CoreGrade } from "../../../lib/game/grade.ts";
import { HERO_TRAIT_CATALOG } from "../../../lib/game/hero-trait.ts";
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
  const traitNames = hero.traits.map((traitId) => HERO_TRAIT_CATALOG[traitId].name);

  return (
    <button
      onClick={onSelect}
      className="text-left transition-colors"
      style={{
        borderRadius: 8,
        border: `1px solid ${selected ? "#d7b765" : "#43606a"}`,
        backgroundColor: selected ? "#1c3b44" : "#17343e",
        backgroundImage: "none",
        padding: "0.6rem 0.7rem 0.8rem",
        fontWeight: 400,
        color: "inherit",
      }}
    >
      <div className="flex items-center justify-between gap-1">
        <h3 className="text-base font-bold text-[#f3dfaa]">{hero.name}</h3>
        <span
          className="whitespace-nowrap rounded border px-1.5 py-0.5 text-xs font-bold"
          style={{ borderColor: GRADE_COLOR[grade], color: GRADE_COLOR[grade] }}
        >
          {grade}급·{ARCHETYPE_LABEL[archetype]}
        </span>
      </div>

      <div className="mt-2 flex items-stretch gap-2">
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
          {/* 병과/내정 are items of this same grid, not a separate block -
              col-start-1 forces each onto a fresh row (CSS grid auto-flow
              can't back-fill column 1 once 매력 has taken row 3's column 1,
              so it advances instead), landing them in the exact column the
              grade values sit in above, with column 2 left blank. */}
          <dl className="grid w-full grid-cols-2 gap-x-2 gap-y-1.5 text-sm">
            <GradeStat label="통솔" grade={hero.attributes.leadership} />
            <GradeStat label="무력" grade={hero.attributes.force} />
            <GradeStat label="지력" grade={hero.attributes.intelligence} />
            <GradeStat label="체력" grade={hero.attributes.vitality} />
            <GradeStat label="매력" grade={hero.attributes.charisma} />
            <TextStat className="col-start-1" label="병과" value={UNIT_TYPE_LABEL[hero.unitType]} />
            {traitNames.length > 0 && (
              <TextStat className="col-start-1" label="특기" value={traitNames.join(" · ")} />
            )}
          </dl>
        </div>
      </div>

      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#c0cbc7]">{hero.description}</p>
    </button>
  );
}

// Mirrors GradeStat's own label/value layout exactly (not a 2-column grid
// of its own) so 병과/특기's value lands at the same x as the grade
// letters above - both are just "label, then justify-between value" inside
// a single grid cell of the same width.
function TextStat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex min-w-0 items-center justify-between gap-1${className ? ` ${className}` : ""}`}>
      <span className="shrink-0 text-[#8fa6a8]">{label}</span>
      <span className="truncate font-bold text-[#e3ce94]">{value}</span>
    </div>
  );
}

// Grade letters (D/C/B/A/S/SS) get their own component rather than reusing
// Stat's left/right layout: the value is centered in a fixed-width slot
// (2ch - room for "SS", the top of the scale, not just the single-letter
// grades currently in use) and colored by GRADE_COLOR instead of a flat
// gold, so the letter itself carries the tier at a glance.
function GradeStat({ label, grade }: { label: string; grade: CoreGrade }) {
  return (
    <div className="flex items-center justify-between gap-1">
      <span className="shrink-0 text-[#8fa6a8]">{label}</span>
      <span
        className="inline-block text-center font-bold"
        style={{ minWidth: "2ch", color: GRADE_COLOR[grade] }}
      >
        {grade}
      </span>
    </div>
  );
}
