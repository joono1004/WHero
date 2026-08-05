"use client";

import { useState } from "react";
import { heroArchetype, heroOverallGrade } from "../../../lib/game/hero-definition.ts";
import type { DomesticSpecialtyKind, HeroDefinition, TraitKind } from "../../../lib/game/hero-definition.ts";
import type { CoreGrade } from "../../../lib/game/grade.ts";
import type { HeroId } from "../../../lib/game/ids.ts";
import { STARTING_HEROES } from "../../../lib/game/starting-heroes.ts";
import { Button } from "../Button.tsx";
import { ARCHETYPE_LABEL, DOMESTIC_LABEL, TRAIT_LABEL, UNIT_TYPE_LABEL } from "../heroLabels.ts";
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
  const domesticEntries = (Object.entries(hero.domesticSpecialties) as [DomesticSpecialtyKind, string][]).filter(
    ([, value]) => value !== "없음",
  );
  const traitEntries = (Object.entries(hero.traits) as [TraitKind, string][]).filter(
    ([, value]) => value !== "없음",
  );

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

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-0.5">
          <dl className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-sm">
            <GradeStat label="통솔" grade={hero.attributes.leadership} />
            <GradeStat label="무력" grade={hero.attributes.force} />
            <GradeStat label="지력" grade={hero.attributes.intelligence} />
            <GradeStat label="체력" grade={hero.attributes.vitality} />
            <GradeStat label="매력" grade={hero.attributes.charisma} />
          </dl>

          <TextStat label="병과" value={UNIT_TYPE_LABEL[hero.unitType]} />
          {domesticEntries.length > 0 && (
            <TextStat
              label="내정"
              value={domesticEntries.map(([key, value]) => `${DOMESTIC_LABEL[key]} ${value}`).join(" · ")}
            />
          )}
        </div>
      </div>

      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#c0cbc7]">{hero.description}</p>
      {traitEntries.length > 0 && (
        <p className="mt-1.5 truncate text-xs text-[#8fa6a8]">
          특기: {traitEntries.map(([key, value]) => `${TRAIT_LABEL[key]} ${value}`).join(" · ")}
        </p>
      )}
    </button>
  );
}

// 병과/내정 share the attribute grid's grid-cols-2 column widths so a
// value here lines up with where the grade column starts above it,
// instead of being pushed flush against the card's right edge.
function TextStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-2 gap-x-2 text-sm">
      <span className="text-[#8fa6a8]">{label}</span>
      <span className="truncate text-left font-bold text-[#e3ce94]">{value}</span>
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
