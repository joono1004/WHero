"use client";

import { useState } from "react";
import type { HeroDefinition } from "../../../lib/game/hero-definition.ts";
import { HERO_SKILL_CATALOG } from "../../../lib/game/hero-skill.ts";
import { HERO_TRAIT_CATALOG } from "../../../lib/game/hero-trait.ts";
import { Button } from "../Button.tsx";
import { HeroCard } from "../HeroCard.tsx";
import { GRADE_COLOR } from "../gradeColors.ts";
import { ARCHETYPE_LABEL, UNIT_TYPE_LABEL } from "../heroLabels.ts";
import { heroArchetype, heroOverallGrade } from "../../../lib/game/hero-definition.ts";

export function HeroSelectScreen({
  onConfirm,
  onBack,
  heroes,
}: {
  onConfirm: (heroId: string) => void;
  onBack: () => void;
  heroes: HeroDefinition[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailHero, setDetailHero] = useState<HeroDefinition | null>(null);

  return (
    <div className="hero-select-screen">
      <header className="hero-select-screen__header">
        <h2 className="text-lg font-bold text-[#f3dfaa]">그대의 여정을 함께할 첫 영웅을 선택하세요</h2>
      </header>
      <div className="hero-select-screen__cards">
        {heroes.map((hero) => (
          <HeroCard
            key={hero.id}
            hero={hero}
            selected={hero.id === selectedId}
            onSelect={() => setSelectedId((currentId) => (currentId === hero.id ? null : hero.id))}
            onDetails={setDetailHero}
          />
        ))}
      </div>
      <footer className="hero-select-screen__footer">
        <Button className="hero-select-screen__button hero-select-screen__button--back" variant="secondary" size="sm" onClick={onBack}>
          뒤로
        </Button>
        <Button className="hero-select-screen__button hero-select-screen__button--confirm" size="sm" onClick={() => selectedId && onConfirm(selectedId)} disabled={!selectedId}>
          이 영웅으로 시작
        </Button>
      </footer>
      {detailHero ? <HeroDetailModal hero={detailHero} onClose={() => setDetailHero(null)} /> : null}
    </div>
  );
}

function HeroDetailModal({ hero, onClose }: { hero: HeroDefinition; onClose: () => void }) {
  const grade = heroOverallGrade(hero.attributes);
  const stats = [
    ["통솔", hero.attributes.leadership],
    ["무력", hero.attributes.force],
    ["지력", hero.attributes.intelligence],
    ["매력", hero.attributes.charisma],
    ["체력", hero.attributes.vitality],
  ] as const;

  return (
    <div className="hero-detail-modal" role="dialog" aria-modal="true" aria-labelledby="hero-detail-title" onClick={onClose}>
      <section className="hero-detail-modal__panel" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="hero-detail-modal__close" onClick={onClose} aria-label="상세보기 닫기">×</button>
        <header>
          <span>{UNIT_TYPE_LABEL[hero.unitType]} · {ARCHETYPE_LABEL[heroArchetype(hero.attributes)]}</span>
          <h3 id="hero-detail-title">{hero.name} <b style={{ color: GRADE_COLOR[grade] }}>{grade}급</b></h3>
        </header>
        <p className="hero-detail-modal__description">{hero.description}</p>
        <div className="hero-detail-modal__stats" aria-label="영웅 능력치">
          {stats.map(([label, value]) => <span key={label}><small>{label}</small><b style={{ color: GRADE_COLOR[value] }}>{value}</b></span>)}
        </div>
        <div className="hero-detail-modal__info">
          <div>
            <h4>특기</h4>
            {hero.traits.map((trait) => <p key={trait}><b>{HERO_TRAIT_CATALOG[trait].name}</b> · {HERO_TRAIT_CATALOG[trait].effect}</p>)}
          </div>
          <div>
            <h4>스킬</h4>
            {hero.skills.length ? hero.skills.map((skill) => <p key={skill}><b>{HERO_SKILL_CATALOG[skill].name}</b> · {HERO_SKILL_CATALOG[skill].summary}</p>) : <p>아직 보유한 전투 스킬이 없습니다.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
