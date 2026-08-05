"use client";

import { useState } from "react";
import { heroArchetype, heroOverallGrade } from "../../../lib/game/hero-definition.ts";
import type { DomesticSpecialtyKind, HeroDefinition, TraitKind } from "../../../lib/game/hero-definition.ts";
import { STARTING_HEROES } from "../../../lib/game/starting-heroes.ts";
import { Button } from "../Button.tsx";
import { ARCHETYPE_LABEL, DOMESTIC_LABEL, TRAIT_LABEL, UNIT_TYPE_LABEL } from "../heroLabels.ts";
import { ScreenShell } from "../ScreenShell.tsx";

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
        padding: "0.5rem 0.6rem",
        fontWeight: 400,
        color: "inherit",
      }}
    >
      <div className="flex gap-2">
        {/* Reserved for Codex's hero portrait art - a plain placeholder
            until that's wired up, so the layout already has room for it. */}
        <div
          className="flex shrink-0 items-center justify-center rounded"
          style={{ width: 48, height: 48, border: "1px solid #43606a", backgroundColor: "#0b2028" }}
        >
          <span className="text-lg text-[#43606a]">🧑</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <h3 className="text-sm font-bold text-[#f3dfaa]">{hero.name}</h3>
            <span className="whitespace-nowrap rounded border border-[#d7b765] px-1 py-0.5 text-[10px] font-bold text-[#d7b765]">
              {grade}급·{ARCHETYPE_LABEL[archetype]}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-[#c0cbc7]">{hero.description}</p>
        </div>
      </div>

      <dl className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs">
        <Stat label="통솔" value={hero.attributes.leadership} />
        <Stat label="무력" value={hero.attributes.force} />
        <Stat label="지력" value={hero.attributes.intelligence} />
        <Stat label="체력" value={hero.attributes.vitality} />
        <Stat label="매력" value={hero.attributes.charisma} />
      </dl>

      {domesticEntries.length > 0 && (
        <p className="mt-1 truncate text-xs text-[#8fa6a8]">
          내정: {domesticEntries.map(([key, value]) => `${DOMESTIC_LABEL[key]} ${value}`).join(" · ")}
        </p>
      )}
      <p className="truncate text-xs text-[#8fa6a8]">
        병과: {UNIT_TYPE_LABEL[hero.unitType]}
      </p>
      {traitEntries.length > 0 && (
        <p className="truncate text-xs text-[#8fa6a8]">
          특기: {traitEntries.map(([key, value]) => `${TRAIT_LABEL[key]} ${value}`).join(" · ")}
        </p>
      )}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[#8fa6a8]">{label}</span>
      <span className="font-bold text-[#e3ce94]">{value}</span>
    </div>
  );
}
