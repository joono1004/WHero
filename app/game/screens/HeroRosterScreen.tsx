"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
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
import { BUNDLED_TREASURE_DEFINITIONS, treasureEffectText, type TreasureDefinition } from "../../../lib/game/treasure-definition.ts";

type SortMode = "grade" | "name" | "level" | "archetype";
type RecruitTab = "heroes" | "treasures";
type RecruitmentPhase = "idle" | "revealing" | "result";
type TreasureExplorePhase = "idle" | "opening" | "result";
type CrystalFlight = { id: number; grade: CoreGrade; startX: number; startY: number; endX: number; endY: number };

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
  { key: "weapon", label: "무기", icon: "/art/ui/equipment-weapon-empty-v2.png" },
  { key: "armor", label: "방어구", icon: "/art/ui/equipment-armor-empty-v2.png" },
  { key: "mount", label: "탈것", icon: "/art/ui/equipment-mount-empty-v2.png" },
  { key: "other", label: "기타", icon: "/art/ui/equipment-other-empty-v2.png" },
] as const;
const BAG_GRID_COLUMNS = 4;
const BAG_EMPTY_PREVIEW_ROWS = 4;
const HERO_FRAGMENT_ART: Record<CoreGrade, string> = {
  SS: "/art/items/hero-fragment-ss-v3.png",
  S: "/art/items/hero-fragment-s-v3.png",
  A: "/art/items/hero-fragment-a-v3.png",
  B: "/art/items/hero-fragment-b-v3.png",
  C: "/art/items/hero-fragment-c-v2.png",
  D: "/art/items/hero-fragment-d-v3.png",
};
const TREASURE_CATEGORY_ART: Record<TreasureDefinition["category"], string> = {
  weapon: "/art/ui/equipment-weapon-empty-v2.png",
  armor: "/art/ui/equipment-armor-empty-v2.png",
  mount: "/art/ui/equipment-mount-empty-v2.png",
  other: "/art/ui/equipment-other-empty-v2.png",
};
const TREASURE_GRADE_BADGE: Record<TreasureDefinition["grade"], string> = {
  SS: "/art/heroes/grades-v2/grade-ss.png",
  S: "/art/heroes/grades-v2/grade-s.png",
  A: "/art/heroes/grades-v2/grade-a.png",
  B: "/art/heroes/grades-v2/grade-b.png",
  C: "/art/heroes/grades-v2/grade-c.png",
  D: "/art/heroes/grades-v2/grade-d.png",
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
  const [recruitmentPhase, setRecruitmentPhase] = useState<RecruitmentPhase>("idle");
  const [revealIndex, setRevealIndex] = useState(0);
  const [crystalFlights, setCrystalFlights] = useState<CrystalFlight[]>([]);
  const [isClaimingRecruitment, setIsClaimingRecruitment] = useState(false);
  const [treasureExplorePhase, setTreasureExplorePhase] = useState<TreasureExplorePhase>("idle");
  const [drawnTreasures, setDrawnTreasures] = useState<TreasureDefinition[]>([]);
  const [treasureRevealIndex, setTreasureRevealIndex] = useState(0);
  const resultCardRefs = useRef(new Map<number, HTMLDivElement>());
  const claimButtonRef = useRef<HTMLButtonElement>(null);
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

  useEffect(() => {
    if (recruitmentPhase !== "revealing" || drawnHeroes.length === 0) return;
    const timer = window.setTimeout(() => {
      if (revealIndex + 1 < drawnHeroes.length) setRevealIndex((current) => current + 1);
      else setRecruitmentPhase("result");
    }, drawnHeroes.length === 1 ? 900 : 680);
    return () => window.clearTimeout(timer);
  }, [drawnHeroes.length, recruitmentPhase, revealIndex]);

  useEffect(() => {
    if (treasureExplorePhase !== "opening" || drawnTreasures.length === 0) return;
    const timer = window.setTimeout(() => {
      if (treasureRevealIndex + 1 < drawnTreasures.length) {
        setTreasureRevealIndex((current) => current + 1);
      } else {
        setTreasureExplorePhase("result");
      }
    }, drawnTreasures.length === 1 ? 900 : 680);
    return () => window.clearTimeout(timer);
  }, [drawnTreasures.length, treasureExplorePhase, treasureRevealIndex]);

  const drawHeroes = (count: number) => {
    const candidates = currentHeroDefinitions();
    if (candidates.length === 0) return;
    setDrawnHeroes(Array.from({ length: Math.min(count, 5) }, () => candidates[Math.floor(Math.random() * candidates.length)]));
    setRevealIndex(0);
    setRecruitmentPhase("revealing");
  };

  const continueRecruiting = () => {
    const candidates = currentHeroDefinitions();
    if (drawnHeroes.length >= 5 || candidates.length === 0) return;
    const nextHero = candidates[Math.floor(Math.random() * candidates.length)];
    setDrawnHeroes((current) => [...current, nextHero]);
    setRevealIndex(drawnHeroes.length);
    setRecruitmentPhase("revealing");
  };

  const exploreTreasures = (count: number) => {
    setDrawnTreasures(Array.from({ length: Math.min(count, 5) }, () => BUNDLED_TREASURE_DEFINITIONS[Math.floor(Math.random() * BUNDLED_TREASURE_DEFINITIONS.length)]));
    setTreasureRevealIndex(0);
    setTreasureExplorePhase("opening");
  };

  const continueExploring = () => {
    if (drawnTreasures.length >= 5) return;
    const nextTreasure = BUNDLED_TREASURE_DEFINITIONS[Math.floor(Math.random() * BUNDLED_TREASURE_DEFINITIONS.length)];
    setDrawnTreasures((current) => [...current, nextTreasure]);
    setTreasureRevealIndex(drawnTreasures.length);
    setTreasureExplorePhase("opening");
  };

  const finishRecruitmentClaim = () => {
    if (drawnHeroes.length === 0) return;
    onClaimRecruitment(recruitmentResult.recruitedHeroes, recruitmentResult.fragmentGrades);
    if (recruitmentResult.recruitedHeroes[0]) setSelectedId(recruitmentResult.recruitedHeroes[0].id);
    setDrawnHeroes([]);
    setRecruitmentPhase("idle");
    setRecruitTab(null);
    setCrystalFlights([]);
    setIsClaimingRecruitment(false);
  };

  const claimRecruitment = () => {
    if (drawnHeroes.length === 0 || isClaimingRecruitment) return;
    const targetBounds = claimButtonRef.current?.getBoundingClientRect();
    const fragmentIndexes = recruitmentResult.resultKinds
      .map((kind, index) => kind === "fragment" ? index : -1)
      .filter((index) => index >= 0);
    if (!targetBounds || fragmentIndexes.length === 0) {
      finishRecruitmentClaim();
      return;
    }
    const endX = targetBounds.left + targetBounds.width / 2;
    const endY = targetBounds.top + targetBounds.height / 2;
    const flights = fragmentIndexes.flatMap((index, flightIndex) => {
      const cardBounds = resultCardRefs.current.get(index)?.getBoundingClientRect();
      const hero = drawnHeroes[index];
      if (!cardBounds || !hero) return [];
      return [{
        id: index * 10 + flightIndex,
        grade: heroOverallGrade(hero.attributes),
        startX: cardBounds.left + cardBounds.width / 2,
        startY: cardBounds.top + cardBounds.height * .57,
        endX,
        endY,
      }];
    });
    if (flights.length === 0) {
      finishRecruitmentClaim();
      return;
    }
    setIsClaimingRecruitment(true);
    setCrystalFlights(flights);
    window.setTimeout(finishRecruitmentClaim, 820);
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
            <div className="recruit-hall__hero-stage">
              {recruitmentPhase === "idle" && <>
                <aside className="recruit-hall__side-note recruit-hall__side-note--l" aria-label="영웅 모집 안내">
                  <strong>재야의 영웅</strong>
                  <span>그대의 깃발을<br />기다립니다.</span>
                </aside>
                <aside className="recruit-hall__side-note recruit-hall__side-note--r" aria-label="모집 결과 안내" data-promo-slot="recruitment">
                  <strong>모집 안내</strong>
                  <span>중복 영웅은<br />등급별 결정으로 전환됩니다.</span>
                </aside>
              </>}
              {recruitmentPhase === "revealing" && drawnHeroes[revealIndex] ? (
                <div className="recruit-hall__reveal" key={`${drawnHeroes[revealIndex].id}-${revealIndex}`}>
                  <div className="recruit-hall__summon-portal">
                    <span className="recruit-hall__summon-flash" />
                    <span className="recruit-hall__summon-cloud" />
                    <HeroCard hero={drawnHeroes[revealIndex]} />
                  </div>
                </div>
              ) : recruitmentPhase === "result" && drawnHeroes.length > 0 ? (
                <>
                  <div className={`recruit-hall__results${drawnHeroes.length > 1 ? ` is-multi is-count-${drawnHeroes.length}` : ""}`}>
                    {drawnHeroes.map((hero, index) => {
                      const isFragment = recruitmentResult.resultKinds[index] === "fragment";
                      const grade = heroOverallGrade(hero.attributes);
                      return (
                        <div key={`${hero.id}-${index}`} ref={(node) => { if (node) resultCardRefs.current.set(index, node); else resultCardRefs.current.delete(index); }} className={`recruit-hall__result-card${isFragment ? " is-fragment" : ""}`}>
                          <HeroCard hero={hero} />
                          {isFragment && <span className="recruit-hall__fragment-result">{grade}결정</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="recruit-hall__draw-actions">
                    {drawnHeroes.length < 5 && <button type="button" className="recruit-hall__action recruit-hall__action--subtle" onClick={continueRecruiting}>계속 모집</button>}
                    <button ref={claimButtonRef} type="button" className={`recruit-hall__action${isClaimingRecruitment ? " is-claiming" : ""}`} disabled={isClaimingRecruitment} onClick={claimRecruitment}>영웅 영입</button>
                  </div>
                  {crystalFlights.map((flight) => <span key={flight.id} className="recruit-hall__crystal-flight" style={{ "--crystal-start-x": `${flight.startX}px`, "--crystal-start-y": `${flight.startY}px`, "--crystal-end-x": `${flight.endX}px`, "--crystal-end-y": `${flight.endY}px` } as CSSProperties}><img src={HERO_FRAGMENT_ART[flight.grade]} alt="" /></span>)}
                </>
              ) : (
                <>
                  <div className="hero-appointment-card recruit-hall__mystery-card" aria-label="아직 모습을 드러내지 않은 영웅 카드">
                    <div className="hero-appointment-card__portrait hero-appointment-card__portrait--empty"><span>?</span></div>
                    <div className="hero-appointment-card__portrait-shade" aria-hidden="true" />
                    <div className="hero-appointment-card__frame" aria-hidden="true" />
                  </div>
                  <div className="recruit-hall__draw-actions">
                    <button type="button" className="recruit-hall__action recruit-hall__action--subtle" onClick={() => drawHeroes(1)}>1회 모집</button>
                    <button type="button" className="recruit-hall__action" onClick={() => drawHeroes(5)}>5회 모집</button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="recruit-hall__treasure-stage" aria-label="보물 탐색">
              {treasureExplorePhase === "idle" && <>
                <aside className="recruit-hall__side-note recruit-hall__side-note--l recruit-hall__side-note--treasure">
                  <strong>잊힌 유적</strong>
                  <span>시대를 건너온<br />보물이 잠들어 있습니다.</span>
                </aside>
                <aside className="recruit-hall__side-note recruit-hall__side-note--r recruit-hall__side-note--treasure">
                  <strong>탐색 안내</strong>
                  <span>발견한 보물은<br />가방에서 확인합니다.</span>
                </aside>
              </>}
              {treasureExplorePhase === "opening" && drawnTreasures[treasureRevealIndex] ? <div className="recruit-hall__treasure-opening" aria-live="polite"><span className="recruit-hall__treasure-burst" /><span className="recruit-hall__treasure-orbit" /><span className="recruit-hall__treasure-sparks" /><img src="/art/recruit/treasure-chest-open-v1.png" alt="열리는 보물상자" /><TreasureRewardCard key={`${drawnTreasures[treasureRevealIndex].id}-${treasureRevealIndex}`} treasure={drawnTreasures[treasureRevealIndex]} isReveal /></div> : treasureExplorePhase === "result" ? <><img className="recruit-hall__treasure-results-chest" src="/art/recruit/treasure-chest-open-v1.png" alt="열린 보물상자" /><div className={`recruit-hall__treasure-results${drawnTreasures.length > 1 ? ` is-multi is-count-${drawnTreasures.length}` : ""}`}>{drawnTreasures.map((treasure, index) => <TreasureRewardCard key={`${treasure.id}-${index}`} treasure={treasure} />)}</div><div className="recruit-hall__draw-actions recruit-hall__treasure-actions">{drawnTreasures.length < 5 && <button type="button" className="recruit-hall__action recruit-hall__action--subtle" onClick={continueExploring}>계속 탐색</button>}<button type="button" className="recruit-hall__action" onClick={() => { setTreasureExplorePhase("idle"); setDrawnTreasures([]); }}>확인</button></div></> : <><button type="button" className="recruit-hall__treasure-chest" onClick={() => exploreTreasures(1)} aria-label="보물상자를 열어 1회 탐색"><img src="/art/recruit/treasure-chest-closed-v1.png" alt="닫힌 보물상자" /></button><div className="recruit-hall__draw-actions recruit-hall__treasure-actions"><button type="button" className="recruit-hall__action recruit-hall__action--subtle" onClick={() => exploreTreasures(1)}>1회 탐색</button><button type="button" className="recruit-hall__action" onClick={() => exploreTreasures(5)}>5회 탐색</button></div></>}
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
              <span key={slot.key} className="hero-ledger__treasure-slot" aria-label={slot.label} title={slot.label}>
                <img src={slot.icon} alt="" />
              </span>
            ))}
          </div>
        </aside>
        <aside className="hero-ledger__bag" aria-label="가방"><p>가방</p><div className="hero-ledger__bag-grid">
          {fragmentItems.map(({ grade, count }) => <span key={grade} className="hero-ledger__fragment" data-grade={grade} title={`${HERO_FRAGMENT_LABEL[grade]} ${count}개`}><img src={HERO_FRAGMENT_ART[grade]} alt={`${grade}결정`} /><small>×{count}</small></span>)}
          {Array.from({ length: Math.max(0, BAG_GRID_COLUMNS * BAG_EMPTY_PREVIEW_ROWS - fragmentItems.length) }, (_, index) => <span key={`empty-${index}`} />)}
        </div></aside>
      </div>
    </section>
  );
}

function TreasureRewardCard({ treasure, isReveal = false }: { treasure: TreasureDefinition; isReveal?: boolean }) {
  return <article className={`recruit-hall__treasure-card${isReveal ? " is-reveal" : ""}`} aria-label={`${treasure.grade}등급 ${treasure.name}`}>
    <img className="recruit-hall__treasure-grade-image" src={TREASURE_GRADE_BADGE[treasure.grade]} alt={`${treasure.grade}등급`} />
    <img src={TREASURE_CATEGORY_ART[treasure.category]} alt="" />
    <b className="recruit-hall__treasure-effect">{treasureEffectText(treasure)}</b>
    <div><strong>{treasure.name}</strong><small>{treasure.history}</small></div>
    <img className="recruit-hall__treasure-card-frame" src="/art/recruit/treasure-card-frame-v5.png" alt="" aria-hidden="true" />
  </article>;
}
