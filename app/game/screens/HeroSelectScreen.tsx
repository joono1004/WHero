"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import { heroArchetype, heroOverallGrade } from "../../../lib/game/hero-definition.ts";
import type { HeroDefinition } from "../../../lib/game/hero-definition.ts";
import type { CoreGrade } from "../../../lib/game/grade.ts";
import { HERO_SKILL_CATALOG } from "../../../lib/game/hero-skill.ts";
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

// 영웅 초상 아트 스펙 (2026-08-xx, Codex 참고용): 카드의 초상 프레임은
// HERO_PORTRAIT_FRAME_PX x HERO_PORTRAIT_FRAME_PX (96x96) 정사각형 고정
// 크기이고, object-fit: cover로 렌더링됩니다 - 즉 프레임보다 넓거나 좁은
// 원본은 중앙 기준으로 잘려서 채워집니다. 기존 위연 샘플
// (wei-yan-classic-portrait-v3.webp)이 512x512 정사각형 webp라 이 프레임에
// 딱 맞게 나옵니다 - 새 영웅 초상도 같은 스펙(정사각형, 512x512 이상 권장,
// webp)으로 맞춰서 public/art/heroes/에 추가하고, 이 HERO_PORTRAIT 맵에
// heroId -> 경로를 등록하면 됩니다. 정사각형이 아닌 원본을 줘도 동작은
// 하지만(가운데 크롭) 인물의 얼굴/핵심 구도가 중앙 근처에 있어야
// 잘림으로 인한 손실이 적습니다.
const HERO_PORTRAIT_FRAME_PX = 96;

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
  const [skillModalOpen, setSkillModalOpen] = useState(false);

  return (
    // Was a <button> - switched to a div (role="button" for the same a11y
    // semantics + keyboard activation) because it now needs to contain a
    // real nested <button> (스킬), and a <button> can't legally contain
    // another interactive control.
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className="cursor-pointer text-left transition-colors"
      style={{
        borderRadius: 8,
        border: `1px solid ${selected ? "#d7b765" : "#43606a"}`,
        backgroundColor: selected ? "#1c3b44" : "#17343e",
        padding: "0.45rem 0.7rem 0.55rem",
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
        {/* Fixed 96x96 square frame for hero portrait art - see HERO_PORTRAIT_FRAME_PX
            below for the full spec Codex should target. Explicit width+height
            (not "stretch to match the stat block" like before) so every card's
            frame is identical whether or not that hero has real art yet:
            leaving height to items-stretch made 위연's real (square, object-cover)
            image render taller than 감녕/서서's plain emoji placeholder, since a
            percentage-sized <img> inside a stretched flex item with no definite
            height falls back to its own intrinsic aspect ratio instead of
            actually stretching (a flexbox/replaced-element sizing quirk). */}
        <div
          className="flex shrink-0 items-center justify-center overflow-hidden rounded"
          style={{
            width: HERO_PORTRAIT_FRAME_PX,
            height: HERO_PORTRAIT_FRAME_PX,
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
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-[#8fa6a8]">특기</p>
          {hero.skills.length > 0 && (
            <button
              onClick={(event) => {
                // Stop the click from also bubbling to the card's onSelect -
                // opening the skill popup shouldn't also select the hero.
                event.stopPropagation();
                setSkillModalOpen(true);
              }}
              className="whitespace-nowrap text-[10px]"
              style={{
                borderRadius: 4,
                border: "1px solid #6ea8e0",
                padding: "0.0625rem 0.375rem",
                backgroundColor: "transparent",
                backgroundImage: "none",
                color: "#6ea8e0",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              스킬
            </button>
          )}
        </div>
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

      {skillModalOpen && (
        <SkillModal
          hero={hero}
          onClose={(event) => {
            event.stopPropagation();
            setSkillModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

// Popup, not a screen change - covers the whole game box (not just this
// card) via position:absolute + inset-0, resolving against DeviceFrame's
// own position:relative box (the nearest positioned ancestor up the tree),
// so it reads as "on top of" the hero-select screen the same way a native
// modal would, on both the desktop preview box and a real phone. 애니메이션
// (전투 중 스킬 사용 연출) 자리는 지금은 빈 placeholder - Codex와 나중에
// 채울 예정 (2026-08-xx).
function SkillModal({ hero, onClose }: { hero: HeroDefinition; onClose: (event: MouseEvent) => void }) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-3"
      style={{ backgroundColor: "rgba(6,16,20,0.75)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[320px] text-left text-sm"
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
          {hero.skills.map((skillId) => {
            const skill = HERO_SKILL_CATALOG[skillId];
            return (
              <div
                key={skillId}
                className="flex items-stretch gap-2 rounded border p-2"
                style={{ borderColor: "#3a4f52" }}
              >
                {/* Reserved for the skill-use animation (전투 중 사용 시 연출) -
                    space only for now, per user direction. One tall box spans
                    the full height of the name/summary/description column
                    beside it (items-stretch), same "portrait beside stat
                    block" pattern as the hero card itself. */}
                <div
                  className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded border border-dashed text-center text-[9px] leading-tight"
                  style={{ width: 72, borderColor: "#3a4f52", color: "#5c7276" }}
                >
                  <span>애니메이션</span>
                  <span>(준비 중)</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#e3ce94]">{skill.name}</p>
                  <p className="mt-0.5 text-xs font-bold text-[#9fc4ea]">{skill.summary}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#c0cbc7]">{skill.description}</p>
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
