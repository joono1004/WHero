"use client";

import type { KeyboardEvent } from "react";
import { heroArchetype, heroOverallGrade } from "../../lib/game/hero-definition.ts";
import type { HeroDefinition } from "../../lib/game/hero-definition.ts";
import { ARCHETYPE_LABEL, UNIT_TYPE_LABEL } from "./heroLabels.ts";
import { HERO_PORTRAIT } from "./heroPortraits.ts";

const GRADE_BADGE: Record<ReturnType<typeof heroOverallGrade>, string> = {
  SS: "/art/heroes/grades-v2/grade-ss.png",
  S: "/art/heroes/grades-v2/grade-s.png",
  A: "/art/heroes/grades-v2/grade-a.png",
  B: "/art/heroes/grades-v2/grade-b.png",
  C: "/art/heroes/grades-v2/grade-c.png",
  D: "/art/heroes/grades-v2/grade-d.png",
};

const UNIT_EMBLEM: Record<HeroDefinition["unitType"], string> = {
  cavalry: "/art/units/cavalry-emblem-v4.webp",
  infantry: "/art/units/infantry-emblem-v4.webp",
  archer: "/art/units/archer-emblem-v4.webp",
  siege: "/art/units/infantry-emblem-v4.webp",
};

// New-game hero selection uses an intentionally light information footprint:
// this is an appointment plaque, not the roster's full statistics screen.
// The large portrait and shared frame preserve the ceremony while leaving the
// council-room background visible around all three candidates.
export function HeroCard({
  hero,
  selected = false,
  onSelect,
  onDetails,
}: {
  hero: HeroDefinition;
  selected?: boolean;
  onSelect?: () => void;
  onDetails?: (hero: HeroDefinition) => void;
}) {
  const grade = heroOverallGrade(hero.attributes);
  const archetype = heroArchetype(hero.attributes);
  const interactiveProps = onSelect
    ? {
        role: "button" as const,
        tabIndex: 0,
        "aria-pressed": selected,
        onClick: onSelect,
        onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        },
      }
    : {};

  return (
    <div
      {...interactiveProps}
      className={`hero-appointment-card${selected ? " hero-appointment-card--selected" : ""}${onSelect ? " hero-appointment-card--interactive" : ""}`}
    >
      {HERO_PORTRAIT[hero.id] ? (
        // eslint-disable-next-line @next/next/no-img-element -- local /public artwork
        <img className="hero-appointment-card__portrait" src={HERO_PORTRAIT[hero.id]} alt={`${hero.name} 초상`} />
      ) : (
        <div className="hero-appointment-card__portrait hero-appointment-card__portrait--empty" aria-label={`${hero.name} 초상 준비 중`}>
          🧑
        </div>
      )}
      <div className="hero-appointment-card__portrait-shade" aria-hidden="true" />
      {/* The class emblem belongs to the portrait, so it remains visible even when the plaque is read at a glance. */}
      <img className="hero-appointment-card__unit-emblem" src={UNIT_EMBLEM[hero.unitType]} alt={`${UNIT_TYPE_LABEL[hero.unitType]} 병과`} />
      <div className="hero-appointment-card__frame" aria-hidden="true" />
      <img className="hero-appointment-card__grade-image" src={GRADE_BADGE[grade]} alt={`${grade}등급`} />
      <div className="hero-appointment-card__nameplate">
        <div className="hero-appointment-card__name-row">
          <h3>{hero.name}</h3>
        </div>
        <p>{ARCHETYPE_LABEL[archetype]}</p>
        <button
          type="button"
          className="hero-appointment-card__details"
          onClick={(event) => {
            event.stopPropagation();
            onDetails?.(hero);
          }}
          aria-label={`${hero.name} 상세보기`}
        >
          <span aria-hidden="true">i</span>
        </button>
      </div>
    </div>
  );
}
