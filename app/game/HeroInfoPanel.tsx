"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import type { CoreGrade } from "../../lib/game/grade.ts";
import { heroArchetype, heroOverallGrade } from "../../lib/game/hero-definition.ts";
import type { HeroDefinition } from "../../lib/game/hero-definition.ts";
import { HERO_SKILL_CATALOG, MAX_HERO_SKILLS } from "../../lib/game/hero-skill.ts";
import { HERO_TRAIT_CATALOG, MAX_HERO_TRAITS } from "../../lib/game/hero-trait.ts";
import { GRADE_COLOR } from "./gradeColors.ts";
import { ARCHETYPE_LABEL, UNIT_TYPE_LABEL } from "./heroLabels.ts";
import { HERO_PORTRAIT } from "./heroPortraits.ts";

// 초상 프레임 (2026-08-07, 사용자가 첨부한 목업대로 재설계: 통솔/무력/
// 지력/체력/매력을 세로 1열로 나열하니 그 옆의 초상도 정사각형(96x96)
// 대신 세로로 긴 직사각형으로 키움). 폭/높이 둘 다 고정값으로 - 아래
// items-stretch로 동적 높이를 주면 실제 아트(<img>)가 그 높이를 못 채우고
// 자기 원본 비율로 쪼그라드는 현상이 있었다는 게 이 파일의 예전 기록이라
// (placeholder 이모지 카드와 높이가 달라짐), 그 문제를 다시 안 겪도록
// 고정 width+height를 유지.
const PORTRAIT_WIDTH_PX = 84;
const PORTRAIT_HEIGHT_PX = 100;

// HeroRosterScreen.tsx의 "영웅정보" 칸 전용 (2026-08-07 분리): 원래
// HeroCard.tsx 하나를 HeroSelectScreen(시작 시 영웅 고르는 화면)과 이
// 화면이 같이 썼는데, 사용자가 목업대로 재설계해달라고 요청한 뒤 "영웅
// 정보창에서만 바뀌어야 했는데, 새게임에서 영웅 선택창은 이전꺼 그대로
// 유지해야해"라고 정정 - 그래서 재설계된 버전(세로 능력치 목록/확대
// 초상/Point 박스/특기 잠김칸 "-")을 이 별도 파일로 떼어내고,
// `HeroCard.tsx`는 원래 모습(2열 그리드/96x96 정사각형/🔒)으로 되돌림.
// `selected`를 항상 `true`로 넘겨 받는 용도(선택 테두리 강조)로만 쓰고,
// 이 화면에서는 클릭으로 다른 카드를 "선택"하는 개념이 없어서
// `onSelect`는 없음(항상 읽기 전용).
export function HeroInfoPanel({ hero, selected = false }: { hero: HeroDefinition; selected?: boolean }) {
  const grade = heroOverallGrade(hero.attributes);
  const archetype = heroArchetype(hero.attributes);
  const [skillModalOpen, setSkillModalOpen] = useState(false);

  return (
    <div
      className="text-left"
      style={{
        borderRadius: 8,
        border: `1px solid ${selected ? "#d7b765" : "#43606a"}`,
        backgroundColor: selected ? "#1c3b44" : "#17343e",
        padding: "0.4rem 0.7rem 0.4rem",
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

      <div className="mt-1 flex items-stretch gap-2">
        <div
          className="flex shrink-0 items-center justify-center overflow-hidden rounded"
          style={{
            width: PORTRAIT_WIDTH_PX,
            height: PORTRAIT_HEIGHT_PX,
            border: "1px solid #43606a",
            backgroundColor: "#0b2028",
          }}
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

        {/* 능력치를 2열 그리드 대신 세로 1열로 나열(목업 그대로) + 그 아래
            "Point" 박스. Point는 목업에 새로 등장한 개념(능력치를 올리는 데
            쓰는 포인트로 추정)인데, 아직 그 시스템 자체가 없어서(레벨업 시
            포인트를 어떻게 얼마나 주는지 미정) 지금은 자리만 예약 - 0
            고정값 표시 + 위쪽 화살표를 눌러도 "아직 준비 중" 안내만 뜸.
            gap-0.5/text-xs로 촘촘하게 - 3줄→5줄+Point박스로 늘어난 세로
            공간을 좁은 화면(844×390) 안에서 스크롤 없이 담기 위한
            간격 최적화(Playwright로 실측하며 조정). */}
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <dl className="flex flex-col gap-0.5 text-xs">
            <GradeStat label="통솔" grade={hero.attributes.leadership} />
            <GradeStat label="무력" grade={hero.attributes.force} />
            <GradeStat label="지력" grade={hero.attributes.intelligence} />
            <GradeStat label="체력" grade={hero.attributes.vitality} />
            <GradeStat label="매력" grade={hero.attributes.charisma} />
          </dl>
          <div
            className="mt-0.5 flex items-center justify-between rounded px-1.5 py-0.5"
            style={{ border: "1px solid #43606a" }}
          >
            <span className="text-[10px] font-bold text-[#8fa6a8]">Point</span>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-[#e3ce94]">0</span>
              <button
                onClick={() => window.alert("아직 준비 중인 기능입니다.")}
                aria-label="능력치 포인트 사용"
                style={{
                  borderRadius: 4,
                  border: "1px solid #6ea8e0",
                  padding: "0 0.25rem",
                  backgroundColor: "transparent",
                  backgroundImage: "none",
                  color: "#6ea8e0",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-0.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-[#8fa6a8]">특기</p>
          <button
            onClick={() => setSkillModalOpen(true)}
            className="whitespace-nowrap"
            style={{
              borderRadius: 4,
              border: "1px solid #6ea8e0",
              padding: "0 0.25rem",
              backgroundColor: "transparent",
              backgroundImage: "none",
              color: "#6ea8e0",
              fontSize: "0.75rem",
              lineHeight: 1.4,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            스킬
          </button>
        </div>
        <div className="mt-0.5 flex gap-1">
          {/* Fixed MAX_HERO_TRAITS slots, always all shown - a hero with
              fewer traits than the max just shows locked slots after their
              earned ones, so the row's length telegraphs "how much growth
              room is left" rather than only ever showing what's owned. */}
          {Array.from({ length: MAX_HERO_TRAITS }, (_, index) => hero.traits[index]).map((traitId, index) => (
            <div
              key={index}
              className="flex flex-1 items-center justify-center rounded border py-0.5 text-xs font-bold"
              style={{
                borderColor: traitId ? "#6ea8e0" : "#3a4f52",
                backgroundColor: traitId ? "rgba(110,168,224,0.1)" : "transparent",
                color: traitId ? "#e3ce94" : "#5c7276",
              }}
            >
              {traitId ? HERO_TRAIT_CATALOG[traitId].name : "-"}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-0.5 line-clamp-3 text-xs leading-relaxed text-[#c0cbc7]">{hero.description}</p>

      {skillModalOpen && <SkillModal hero={hero} onClose={() => setSkillModalOpen(false)} />}
    </div>
  );
}

// Popup, not a screen change - covers the whole game box (not just this
// card) via position:absolute + inset-0, resolving against DeviceFrame's
// own position:relative box (the nearest positioned ancestor up the tree),
// so it reads as "on top of" whichever screen hosts the panel the same way
// a native modal would, on both the desktop preview box and a real phone.
// 애니메이션(전투 중 스킬 사용 연출) 자리는 지금은 빈 placeholder - Codex와
// 나중에 채울 예정 (2026-08-xx).
function SkillModal({ hero, onClose }: { hero: HeroDefinition; onClose: (event: MouseEvent) => void }) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-3"
      style={{ backgroundColor: "rgba(6,16,20,0.75)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[550px] text-left text-sm"
        style={{ borderRadius: 8, border: "1px solid #43606a", backgroundColor: "#17343e", padding: "0.75rem" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-[#f3dfaa]">{hero.name}의 스킬</h4>
          <button
            onClick={onClose}
            aria-label="닫기"
            style={{
              borderRadius: 4,
              border: "1px solid #43606a",
              padding: "0.0625rem 0.375rem",
              backgroundColor: "transparent",
              backgroundImage: "none",
              color: "#c0cbc7",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div className="mt-2 flex flex-col gap-2">
          {/* Fixed MAX_HERO_SKILLS slots, always all shown - same "telegraph
              growth room" idea as the card's own 특기 slot bar. An empty
              slot shows a lock icon where the animation preview would go
              and "미확인" in place of the name/summary/description, rather
              than the row list just being shorter for a hero with fewer
              skills. */}
          {Array.from({ length: MAX_HERO_SKILLS }, (_, index) => hero.skills[index]).map((skillId, index) => {
            const skill = skillId ? HERO_SKILL_CATALOG[skillId] : null;
            return (
              <div
                key={index}
                className="flex items-stretch gap-2 rounded border p-2"
                style={{ borderColor: "#3a4f52" }}
              >
                {/* Reserved for the skill-use animation (전투 중 사용 시 연출) -
                    space only for now, per user direction. minHeight: 100
                    (was ~91.5px natural content height, +10% per user
                    request) is set directly on this box rather than the row,
                    so it's the one driving the row's height via
                    items-stretch - both a filled slot (whose own text column
                    is naturally shorter than 100px) and a locked slot (just
                    "미확인", far shorter) end up stretched to the exact same
                    row height instead of a locked slot shrinking to fit its
                    own shorter content. Font bumped 10px -> 11px to match
                    the +10% box height. */}
                <div
                  className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded border border-dashed text-center text-[11px] leading-tight"
                  style={{ width: 120, minHeight: 100, borderColor: "#3a4f52", color: "#5c7276" }}
                >
                  {skill ? (
                    <>
                      <span>애니메이션</span>
                      <span>(준비 중)</span>
                    </>
                  ) : (
                    <span className="text-2xl">🔒</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold" style={{ color: skill ? "#e3ce94" : "#5c7276" }}>
                    {skill ? skill.name : "미확인"}
                  </p>
                  {skill && (
                    <>
                      <p className="mt-0.5 text-sm font-bold text-[#9fc4ea]">{skill.summary}</p>
                      <p className="mt-1 text-sm leading-relaxed text-[#c0cbc7]">{skill.description}</p>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
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
