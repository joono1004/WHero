"use client";

import { useState } from "react";
import { heroArchetype, heroOverallGrade } from "../../../lib/game/hero-definition.ts";
import type { HeroListEntry } from "../../../lib/game/hero-roster.ts";
import { compareByArchetype, compareByGrade, compareByLevel, currentHeroDefinitions } from "../../../lib/game/hero-roster.ts";
import { HERO_FRAGMENT_ITEM_ID, HERO_FRAGMENT_LABEL, heroFragmentGrade, resolveRecruitmentDraws } from "../../../lib/game/hero-recruitment.ts";
import type { CoreGrade } from "../../../lib/game/grade.ts";
import { GRADE_COLOR } from "../gradeColors.ts";
import { HeroCard } from "../HeroCard.tsx";
import { HeroInfoPanel } from "../HeroInfoPanel.tsx";
import { ARCHETYPE_LABEL, UNIT_TYPE_LABEL } from "../heroLabels.ts";
import { HERO_PORTRAIT } from "../heroPortraits.ts";
import type { HeroDefinition } from "../../../lib/game/hero-definition.ts";

type SortMode = "grade" | "name" | "level" | "archetype";
type RecruitTab = "heroes" | "treasures";

const SORT_COMPARATORS: Record<SortMode, (a: HeroListEntry, b: HeroListEntry) => number> = {
  grade: compareByGrade,
  name: (a, b) => a.definition.name.localeCompare(b.definition.name, "ko"),
  archetype: compareByArchetype,
  level: compareByLevel,
};
const SORT_ORDER: SortMode[] = ["grade", "name", "level", "archetype"];
const SORT_LABEL: Record<SortMode, string> = { grade: "등급순", name: "이름순", level: "레벨순", archetype: "병과순" };
const SORT_LABEL_SHORT: Record<SortMode, string> = { grade: "등급", name: "이름", level: "레벨", archetype: "병과" };
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
const HERO_FRAGMENT_ART: Record<CoreGrade, string> = {
  SS: "/art/items/hero-fragment-ss-v1.png",
  S: "/art/items/hero-fragment-s-v1.png",
  A: "/art/items/hero-fragment-a-v3.png",
  B: "/art/items/hero-fragment-b-v1.png",
  C: "/art/items/hero-fragment-c-v1.png",
  D: "/art/items/hero-fragment-d-v1.png",
};

/** 10명(2열×5행)을 한눈에 보여주는 모바일 가로용 영웅 기록첩. */
export function HeroRosterScreen({
  entries, initialHeroId, fragmentItemIds, onBack, onToggleDeploymentPriority, onClaimRecruitment, governorLabelFor,
}: {
  entries: HeroListEntry[];
  initialHeroId: string | null;
  fragmentItemIds: string[];
  onBack: () => void;
  onToggleDeploymentPriority: (heroId: string) => void;
  onClaimRecruitment: (heroes: HeroDefinition[], fragmentGrades: CoreGrade[]) => void;
  governorLabelFor: (state: HeroListEntry["state"]) => string | null;
}) {
  const [sortMode, setSortMode] = useState<SortMode>("grade");
  const [selectedId, setSelectedId] = useState<string | null>(initialHeroId);
  const [recruitTab, setRecruitTab] = useState<RecruitTab | null>(null);
  const [drawnHeroes, setDrawnHeroes] = useState<HeroDefinition[]>([]);
  const sorted = [...entries].sort(SORT_COMPARATORS[sortMode]);
  const deploymentHeroCount = entries.filter((entry) => entry.state.deploymentPriority).length;
  const selectedIndex = sorted.findIndex((entry) => entry.state.heroId === selectedId);
  const selected = selectedIndex >= 0 ? sorted[selectedIndex] : (sorted[0] ?? null);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const goPrev = () => activeIndex > 0 && setSelectedId(sorted[activeIndex - 1].state.heroId);
  const goNext = () => activeIndex < sorted.length - 1 && setSelectedId(sorted[activeIndex + 1].state.heroId);
  const recruitmentResult = resolveRecruitmentDraws(drawnHeroes, entries.map((entry) => entry.state.heroId));
  const fragmentItems = (["SS", "S", "A", "B", "C", "D"] as CoreGrade[]).flatMap((grade) => {
    const count = fragmentItemIds.filter((itemId) => itemId === HERO_FRAGMENT_ITEM_ID[grade]).length;
    return count ? [{ grade, count }] : [];
  });

  const drawHeroes = (count: number) => {
    const candidates = currentHeroDefinitions();
    if (candidates.length === 0) return;
    setDrawnHeroes(Array.from({ length: count }, () => candidates[Math.floor(Math.random() * candidates.length)]));
  };

  const claimRecruitment = () => {
    if (drawnHeroes.length === 0) return;
    onClaimRecruitment(recruitmentResult.recruitedHeroes, recruitmentResult.fragmentGrades);
    if (recruitmentResult.recruitedHeroes[0]) setSelectedId(recruitmentResult.recruitedHeroes[0].id);
    setDrawnHeroes([]);
    setRecruitTab(null);
  };

  if (recruitTab) {
    return (
      <section className={`recruit-hall is-${recruitTab}`} aria-label="영웅 모집과 보물 탐색">
        <header className="recruit-hall__header">
          <button className="hero-ledger__back" onClick={() => setRecruitTab(null)} aria-label="영웅정보으로 돌아가기" title="뒤로가기" />
          <nav className="recruit-hall__tabs" aria-label="모집과 탐색 선택">
            <button className={recruitTab === "heroes" ? "is-active" : ""} onClick={() => setRecruitTab("heroes")}>영웅 모집</button>
            <button className={recruitTab === "treasures" ? "is-active" : ""} onClick={() => setRecruitTab("treasures")}>보물 탐색</button>
          </nav>
        </header>
        <main className="recruit-hall__content">
          {recruitTab === "heroes" ? (
            <div className="recruit-hall__panel recruit-hall__panel--hero-draw is-heroes">
              {drawnHeroes.length > 0 ? (
                <>
                  <p className="recruit-hall__eyebrow">모집 결과 · {drawnHeroes.length}명</p>
                  <div className={`recruit-hall__results${drawnHeroes.length >= 10 ? " is-ten" : ""}`}>
                    {drawnHeroes.map((hero, index) => {
                      const isFragment = recruitmentResult.resultKinds[index] === "fragment";
                      const grade = heroOverallGrade(hero.attributes);
                      return (
                        <div key={`${hero.id}-${index}`} className={`recruit-hall__result-card${isFragment ? " is-fragment" : ""}`}>
                          <HeroCard hero={hero} />
                          {isFragment && <span className="recruit-hall__fragment-result">{grade} 조각</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="recruit-hall__draw-actions">
                    <button type="button" className="recruit-hall__action recruit-hall__action--subtle" onClick={() => setDrawnHeroes([])}>다시 모집</button>
                    <button type="button" className="recruit-hall__action" onClick={claimRecruitment}>결과 수령</button>
                  </div>
                </>
              ) : (
                <>
                  <span className="recruit-hall__emblem" aria-hidden="true">⚜</span>
                  <h2>영웅 모집</h2>
                  <p>재야에 묻힌 영웅을 찾아, 그대의 깃발 아래로 맞이하세요.</p>
                  <small className="recruit-hall__ticket">모집권 <b>∞</b> · 테스트 기간에는 소모되지 않습니다.</small>
                  <div className="recruit-hall__draw-actions">
                    <button type="button" className="recruit-hall__action recruit-hall__action--subtle" onClick={() => drawHeroes(1)}>1회 모집</button>
                    <button type="button" className="recruit-hall__action" onClick={() => drawHeroes(10)}>10회 모집</button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="recruit-hall__panel is-treasures">
              <span className="recruit-hall__emblem" aria-hidden="true">✦</span>
              <h2>보물 탐색</h2>
              <p>전장에서 빛날 귀중한 보물을 찾을 준비를 하고 있습니다.</p>
              <small>보물 획득 방식과 연출은 다음 단계에서 추가됩니다.</small>
            </div>
          )}
        </main>
      </section>
    );
  }

  return (
    <section className="hero-ledger" aria-label="영웅정보">
      <header className="hero-ledger__header">
        <button className="hero-ledger__back" onClick={onBack} aria-label="로비로 돌아가기" title="뒤로가기" />
        <div><h2>영웅정보</h2></div>
        <div className="hero-ledger__recruit-actions">
          <button className="hero-ledger__recruit hero-ledger__recruit--heroes" onClick={() => setRecruitTab("heroes")} aria-label="영웅 모집" title="영웅 모집" />
          <button className="hero-ledger__recruit hero-ledger__recruit--treasures" onClick={() => setRecruitTab("treasures")} aria-label="보물 탐색" title="보물 탐색" />
        </div>
      </header>

      <div className="hero-ledger__body">
        <aside className="hero-ledger__roster" aria-label="보유 영웅 목록">
          <div className="hero-ledger__sorts">
            {SORT_ORDER.map((mode) => (
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
              const isRequiredDeploymentHero = state.deploymentPriority && deploymentHeroCount <= 1;
              return (
                <div key={state.heroId} role="button" tabIndex={0} className={`hero-ledger__card${isSelected ? " is-selected" : ""}`} onClick={() => setSelectedId(state.heroId)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(state.heroId); } }} aria-pressed={isSelected}>
                  <span className="hero-ledger__card-portrait" style={{ borderColor: isSelected ? "#67b8ef" : GRADE_COLOR[grade] }}>
                    {portraitUrl ? <img src={portraitUrl} alt="" /> : <span>?</span>}
                  </span>
                  <span className="hero-ledger__card-copy">
                    <span className="hero-ledger__card-title"><b>{definition.name}</b></span>
                    <span className="hero-ledger__card-type"><b style={{ color: GRADE_COLOR[grade] }}>{grade}등급</b> · Lv.{state.level} · {UNIT_TYPE_LABEL[definition.unitType]} · {ARCHETYPE_LABEL[archetype]}</span>
                    <span className={`hero-ledger__card-governor${governorLabel ? " is-governor" : ""}`}>{governorLabel ?? "일반"}</span>
                  </span>
                  <button
                    type="button"
                    aria-label={state.deploymentPriority ? `${definition.name} 출전 해제` : `${definition.name} 출전 등록`}
                    className={`hero-ledger__deploy${state.deploymentPriority ? " is-active" : ""}`}
                    disabled={isRequiredDeploymentHero}
                    title={isRequiredDeploymentHero ? "출전 영웅은 최소 1명이 필요합니다" : undefined}
                    onClick={(event) => { event.stopPropagation(); onToggleDeploymentPriority(state.heroId); }}
                  >출전</button>
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
        <aside className="hero-ledger__bag" aria-label="가방"><p>가방</p><div className="hero-ledger__bag-grid">
          {fragmentItems.map(({ grade, count }) => <span key={grade} className="hero-ledger__fragment" data-grade={grade} title={`${HERO_FRAGMENT_LABEL[grade]} ${count}개`}><img src={HERO_FRAGMENT_ART[grade]} alt={`${grade}등급 영웅 조각`} /><small>×{count}</small></span>)}
          {Array.from({ length: Math.max(0, BAG_GRID_COLUMNS * BAG_EMPTY_PREVIEW_ROWS - fragmentItems.length) }, (_, index) => <span key={`empty-${index}`} />)}
        </div></aside>
      </div>
    </section>
  );
}
