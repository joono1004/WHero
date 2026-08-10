"use client";

import type { KeyboardEvent } from "react";
import { heroOverallGrade } from "../../lib/game/hero-definition.ts";
import type { HeroDefinition } from "../../lib/game/hero-definition.ts";
import { GRADE_COLOR } from "./gradeColors.ts";
import { UNIT_TYPE_LABEL } from "./heroLabels.ts";
import { HERO_PORTRAIT } from "./heroPortraits.ts";

// New-game hero selection uses an intentionally light information footprint:
// this is an appointment plaque, not the roster's full statistics screen.
// The large portrait and shared frame preserve the ceremony while leaving the
// council-room background visible around all three candidates.
export function HeroCard({
  hero,
  selected = false,
  onSelect,
}: {
  hero: HeroDefinition;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const grade = heroOverallGrade(hero.attributes);
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
      <div className="hero-appointment-card__frame" aria-hidden="true" />
      <div className="hero-appointment-card__nameplate">
        <h3>{hero.name}</h3>
        <p>
          <span>{UNIT_TYPE_LABEL[hero.unitType]}</span>
          <b style={{ color: GRADE_COLOR[grade] }}>{grade}급</b>
        </p>
      </div>
    </div>
  );
}
