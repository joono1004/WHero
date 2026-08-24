"use client";

import { useState } from "react";
import { heroArchetype, heroOverallGrade } from "../../../lib/game/hero-definition.ts";
import type { HeroListEntry } from "../../../lib/game/hero-roster.ts";
import { compareByArchetype, compareByGrade, compareByLevel } from "../../../lib/game/hero-roster.ts";
import { GRADE_COLOR } from "../gradeColors.ts";
import { HeroInfoPanel } from "../HeroInfoPanel.tsx";
import { ARCHETYPE_LABEL, UNIT_TYPE_LABEL } from "../heroLabels.ts";
import { HERO_PORTRAIT } from "../heroPortraits.ts";

type SortMode = "grade" | "archetype" | "level";

const SORT_COMPARATORS: Record<SortMode, (a: HeroListEntry, b: HeroListEntry) => number> = {
  grade: compareByGrade,
  archetype: compareByArchetype,
  level: compareByLevel,
};
const SORT_LABEL: Record<SortMode, string> = { grade: "등급순", archetype: "유형순", level: "레벨순" };
const SORT_LABEL_SHORT: Record<SortMode, string> = { grade: "등급", archetype: "병과", level: "레벨" };
const HERO_LOBBY_FACE: Partial<Record<string, string>> = {
  "zhang-bao": "/art/heroes/zhang-bao-lobby-face-v1.png",
  "wei-yan": "/art/heroes/wei-yan-lobby-face-v1.png",
  "xu-shu": "/art/heroes/xu-shu-lobby-face-v1.png",
};
const EQUIPMENT_SLOTS = [
  { key: "weapon", label: "무기", icon: "/art/ui/equipment-weapon-slot-v1.svg" },
  { key: "armor", label: "방어구", icon: "/art/ui/equipment-armor-slot-v1.svg" },
  { key: "mount", label: "탈것", icon: "/art/ui/equipment-mount-slot-v1.svg" },
  { key: "other", label: "기타", icon: "/art/ui/equipment-other-slot-v1.svg" },
] as const;
const BAG_GRID_COLUMNS = 4;
const BAG_EMPTY_PREVIEW_ROWS = 4;

/** 10명(2열×5행)을 한눈에 보여주는 모바일 가로용 영웅 기록첩. */
export function HeroRosterScreen({
  entries, initialHeroId, onBack, onToggleDeploymentPriority, governorLabelFor,
}: {
  entries: HeroListEntry[];
  initialHeroId: string | null;
  onBack: () => void;
  onToggleDeploymentPriority: (heroId: string) => void;
  governorLabelFor: (state: HeroListEntry["state"]) => string | null;
}) {
  const [sortMode, setSortMode] = useState<SortMode>("grade");
  const [selectedId, setSelectedId] = useState<string | null>(initialHeroId);
  const sorted = [...entries].sort(SORT_COMPARATORS[sortMode]);
  const selectedIndex = sorted.findIndex((entry) => entry.state.heroId === selectedId);
  const selected = selectedIndex >= 0 ? sorted[selectedIndex] : (sorted[0] ?? null);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const goPrev = () => activeIndex > 0 && setSelectedId(sorted[activeIndex - 1].state.heroId);
  const goNext = () => activeIndex < sorted.length - 1 && setSelectedId(sorted[activeIndex + 1].state.heroId);

  return (
    <section className="hero-ledger" aria-label="영웅정보">
      <header className="hero-ledger__header">
        <button className="hero-ledger__back" onClick={onBack} aria-label="로비로 돌아가기" title="뒤로가기" />
        <div><h2>영웅정보</h2></div>
      </header>

      <div className="hero-ledger__body">
        <aside className="hero-ledger__roster" aria-label="보유 영웅 목록">
          <div className="hero-ledger__sorts">
            {(Object.keys(SORT_LABEL) as SortMode[]).map((mode) => (
              <button key={mode} onClick={() => setSortMode(mode)} className={sortMode === mode ? "is-active" : ""} aria-label={SORT_LABEL[mode]} title={SORT_LABEL[mode]}>
                <span className="hero-ledger__sort-label">{SORT_LABEL_SHORT[mode]}</span>
              </button>
            ))}
          </div>
          <div className="hero-ledger__cards">
            {sorted.length === 0 && <p className="hero-ledger__empty">영웅이 없습니다.</p>}
            {sorted.map(({ state, definition }) => {
              const grade = heroOverallGrade(definition.attributes);
              const archetype = heroArchetype(definition.attributes);
              const portraitUrl = HERO_LOBBY_FACE[definition.id] ?? HERO_PORTRAIT[definition.id];
              const isSelected = state.heroId === selected?.state.heroId;
              const governorLabel = governorLabelFor(state);
              return (
                <div key={state.heroId} role="button" tabIndex={0} className={`hero-ledger__card${isSelected ? " is-selected" : ""}`} onClick={() => setSelectedId(state.heroId)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(state.heroId); } }} aria-pressed={isSelected}>
                  <span className="hero-ledger__card-portrait" style={{ borderColor: isSelected ? "#67b8ef" : GRADE_COLOR[grade] }}>
                    {portraitUrl ? <img src={portraitUrl} alt="" /> : <span>?</span>}
                  </span>
                  <span className="hero-ledger__card-copy">
                    <span className="hero-ledger__card-title"><b>{definition.name}</b><small>Lv.{state.level}</small><em style={{ color: GRADE_COLOR[grade] }}>{grade}</em></span>
                    <span className="hero-ledger__card-type">{UNIT_TYPE_LABEL[definition.unitType]} · {ARCHETYPE_LABEL[archetype]}{governorLabel ? ` · ${governorLabel}` : ""}</span>
                    <span className="hero-ledger__card-attributes">통 {definition.attributes.leadership} · 무 {definition.attributes.force} · 지 {definition.attributes.intelligence} · 체 {definition.attributes.vitality} · 매 {definition.attributes.charisma}</span>
                  </span>
                  <button type="button" aria-label={`${definition.name} 출전 우선 표시`} className={`hero-ledger__deploy${state.deploymentPriority ? " is-active" : ""}`} onClick={(event) => { event.stopPropagation(); onToggleDeploymentPriority(state.heroId); }}>★</button>
                </div>
              );
            })}
          </div>
        </aside>

        <main className="hero-ledger__detail">
          {selected ? <HeroInfoPanel hero={selected.definition} selected /> : <p className="hero-ledger__empty">표시할 영웅이 없습니다.</p>}
          {selected && <nav className="hero-ledger__pager" aria-label="영웅 이동"><button onClick={goPrev} disabled={activeIndex <= 0}>‹</button><span>{activeIndex + 1} / {sorted.length}</span><button onClick={goNext} disabled={activeIndex >= sorted.length - 1}>›</button></nav>}
        </main>

        <aside className="hero-ledger__treasures" aria-label="장착 장비">
          <p>장착 장비</p>
          <div>
            {EQUIPMENT_SLOTS.map((slot) => (
              <span key={slot.key} className="hero-ledger__treasure-slot" title={slot.label}>
                <img src={slot.icon} alt="" />
                <small>{slot.label}</small>
              </span>
            ))}
          </div>
        </aside>
        <aside className="hero-ledger__bag" aria-label="가방"><p>가방</p><div className="hero-ledger__bag-grid">{Array.from({ length: BAG_GRID_COLUMNS * BAG_EMPTY_PREVIEW_ROWS }, (_, index) => <span key={index} />)}</div></aside>
      </div>
    </section>
  );
}
