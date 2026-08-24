"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import type { CoreGrade } from "../../lib/game/grade.ts";
import { nextGrade, pipsRequiredForNextGrade } from "../../lib/game/grade.ts";
import { heroArchetype, heroOverallGrade } from "../../lib/game/hero-definition.ts";
import type { HeroDefinition } from "../../lib/game/hero-definition.ts";
import { HERO_SKILL_CATALOG, MAX_HERO_SKILLS } from "../../lib/game/hero-skill.ts";
import { HERO_TRAIT_CATALOG, MAX_HERO_TRAITS } from "../../lib/game/hero-trait.ts";
import { GRADE_COLOR } from "./gradeColors.ts";
import { ARCHETYPE_LABEL, UNIT_TYPE_LABEL } from "./heroLabels.ts";
import { HERO_PORTRAIT } from "./heroPortraits.ts";

const GRADE_BADGE: Record<CoreGrade, string> = {
  SS: "/art/heroes/grades-v2/grade-ss.png",
  S: "/art/heroes/grades-v2/grade-s.png",
  A: "/art/heroes/grades-v2/grade-a.png",
  B: "/art/heroes/grades-v2/grade-b.png",
  C: "/art/heroes/grades-v2/grade-c.png",
  D: "/art/heroes/grades-v2/grade-d.png",
};

/** 중앙 양피지의 실제 영웅 데이터 영역. 배경 장식은 CSS, 정보는 HTML로 유지한다. */
export function HeroInfoPanel({ hero }: { hero: HeroDefinition; selected?: boolean }) {
  const grade = heroOverallGrade(hero.attributes);
  const archetype = heroArchetype(hero.attributes);
  const [skillModalOpen, setSkillModalOpen] = useState(false);

  return (
    <article className="hero-dossier">
      <div className="hero-dossier__identity">
        <div className="hero-dossier__portrait">
          {HERO_PORTRAIT[hero.id] ? <img src={HERO_PORTRAIT[hero.id]} alt={`${hero.name} 초상`} /> : <span>?</span>}
        </div>
        <div className="hero-dossier__stats">
          <div className="hero-dossier__name-row">
            <div><h3>{hero.name}</h3></div>
            <span className="hero-dossier__rank" title={`종합 ${grade}등급`}>
              <img src={GRADE_BADGE[grade]} alt={`${grade}등급`} />
            </span>
          </div>
          <p className="hero-dossier__class">{UNIT_TYPE_LABEL[hero.unitType]} · {ARCHETYPE_LABEL[archetype]}</p>
          <dl>
            <GradeStat label="통솔" grade={hero.attributes.leadership} />
            <GradeStat label="무력" grade={hero.attributes.force} />
            <GradeStat label="지력" grade={hero.attributes.intelligence} />
            <GradeStat label="체력" grade={hero.attributes.vitality} />
            <GradeStat label="매력" grade={hero.attributes.charisma} />
          </dl>
          <button className="hero-dossier__details" onClick={() => setSkillModalOpen(true)}>전력 상세 ›</button>
        </div>
      </div>

      <div className="hero-dossier__traits">
        <p>특기</p>
        <div>{Array.from({ length: MAX_HERO_TRAITS }, (_, index) => hero.traits[index]).map((traitId, index) => <span key={index} className={traitId ? "is-filled" : ""}>{traitId ? HERO_TRAIT_CATALOG[traitId].name : "미확인"}</span>)}</div>
      </div>

      <div className="hero-dossier__skills">
        {Array.from({ length: MAX_HERO_SKILLS }, (_, index) => hero.skills[index]).map((skillId, index) => {
          const skill = skillId ? HERO_SKILL_CATALOG[skillId] : null;
          return <button key={index} className={skill ? "is-filled" : ""} onClick={() => setSkillModalOpen(true)} aria-label={skill ? `${skill.name} 상세` : "미확인 스킬"}><span>{skill ? "✦" : "◇"}</span><small>{skill ? skill.name : "잠김"}</small></button>;
        })}
      </div>
      <p className="hero-dossier__description">{hero.description}</p>
      {skillModalOpen && <SkillModal hero={hero} onClose={() => setSkillModalOpen(false)} />}
    </article>
  );
}

function SkillModal({ hero, onClose }: { hero: HeroDefinition; onClose: (event: MouseEvent) => void }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3" style={{ backgroundColor: "rgba(20,10,4,.72)" }} onClick={onClose}>
      <div className="w-full max-w-[550px] rounded-md border border-[#c49743] bg-[#2a1609] p-3 text-left text-sm text-[#f1dfac] shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 border-b border-[#79501e] pb-2"><h4 className="font-bold">{hero.name}의 스킬</h4><button onClick={onClose} className="rounded border border-[#a77732] px-2 text-[#f1dfac]">✕</button></div>
        <div className="mt-2 grid gap-2">
          {Array.from({ length: MAX_HERO_SKILLS }, (_, index) => hero.skills[index]).map((skillId, index) => {
            const skill = skillId ? HERO_SKILL_CATALOG[skillId] : null;
            return <div key={index} className="rounded border border-[#68451c] bg-[#1c1009] p-2"><b className={skill ? "text-[#f2d17b]" : "text-[#887153]"}>{skill ? skill.name : "미확인"}</b>{skill && <><p className="mt-1 font-bold text-[#9fc4ea]">{skill.summary}</p><p className="mt-1 text-[#dfcfaf]">{skill.description}</p></>}</div>;
          })}
        </div>
      </div>
    </div>
  );
}

function GradeStat({ label, grade }: { label: string; grade: CoreGrade }) {
  const required = pipsRequiredForNextGrade(grade);
  const following = nextGrade(grade);
  return (
    <div className="hero-dossier__stat">
      <dt>{label}</dt>
      <dd>
        <img src={GRADE_BADGE[grade]} alt={`${grade}등급`} />
        <span className="hero-dossier__xp" aria-label={required ? `${label} 승급 경험치 0 / ${required}` : `${label} 최고 등급`}>
          <i style={{ backgroundColor: GRADE_COLOR[grade], width: "0%" }} />
          <small>{required ? `0 / ${required}` : "최고"}</small>
        </span>
        <em>{following ? `→ ${following}` : "MAX"}</em>
      </dd>
    </div>
  );
}
