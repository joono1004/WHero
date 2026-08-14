"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { HeroState } from "../../../lib/game/hero.ts";
import { buildHeroListEntries } from "../../../lib/game/hero-roster.ts";
import type { MapCandidate } from "../../../lib/game/map-candidates.ts";
import { MAP_TIER_INFO, MAP_TYPE_INFO } from "../../../lib/game/world.ts";
import type { HexDiagnostic } from "../../../lib/world/model/world-map";
import { Button } from "../Button.tsx";
import { HERO_PORTRAIT } from "../heroPortraits.ts";

const GameWorldMap = dynamic(() => import("../../../components/world/GameWorldMap").then((module) => module.GameWorldMap), { ssr: false });

function briefingLocation(candidate: MapCandidate, countryId: number) {
  if (countryId === 1) return { country: "매우 작은 섬나라", region: "시작섬" };
  return {
    country: `${MAP_TIER_INFO[candidate.generation.mapTier].label} ${MAP_TYPE_INFO[candidate.generation.mapType].label} 나라`,
    region: `${MAP_TYPE_INFO[candidate.generation.mapType].label} 지역`,
  };
}

export function BattleBriefingScreen({ candidate, heroes, initialHeroId, countryId, onBack, onStart }: {
  candidate: MapCandidate;
  heroes: HeroState[];
  initialHeroId: string;
  countryId: number;
  onBack: () => void;
  onStart: (heroId: string) => void;
}) {
  const [selectedHeroId, setSelectedHeroId] = useState(initialHeroId);
  const [mapReady, setMapReady] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const entries = buildHeroListEntries(heroes);
  const typeInfo = MAP_TYPE_INFO[candidate.generation.mapType];
  const tierInfo = MAP_TIER_INFO[candidate.generation.mapTier];
  const location = briefingLocation(candidate, countryId);
  const onHexSelected = (_diagnostic: HexDiagnostic) => undefined;
  const loadingMessages = ["영웅들이 전투 지역으로 이동 중입니다.", "병사들이 이동 중입니다.", "진형을 갖춥니다."];
  const terrainPreview = countryId === 1
    ? "/art/briefing/terrain-preview-island-mini-v1.png"
    : "/art/briefing/terrain-preview-island-mini-v1.png";

  useEffect(() => {
    if (mapReady) return;
    const timer = window.setInterval(() => setLoadingStep((step) => Math.min(step + 1, loadingMessages.length - 1)), 1200);
    return () => window.clearInterval(timer);
  }, [mapReady, loadingMessages.length]);

  return (
    <div className="battle-briefing">
      <img className="battle-briefing__tent" src="/art/briefing/command-tent-v1.png" alt="" />
      <div className="battle-briefing__map-preload" aria-hidden="true">
        <GameWorldMap seed={candidate.generation.seed} mapTierId={candidate.generation.mapTier} mapTypeId={candidate.generation.mapType} turn={1} onHexSelected={onHexSelected} onReady={() => setMapReady(true)} />
      </div>
      <div className="battle-briefing__table-map" aria-label={`${typeInfo.label} 작전 지도`}><img src={terrainPreview} alt="" /></div>
      <section className="battle-briefing__panel">
        <header className="battle-briefing__header"><span>전투 브리핑</span><Button size="sm" variant="secondary" onClick={onBack}>돌아가기</Button></header>
        <div className="battle-briefing__mission">
          <strong>{location.country} <i>-</i> {location.region}</strong>
          <p>목표 : 적 주둔지를 모두 점령하세요.</p>
        </div>
        <div className="battle-briefing__grid">
          <div><h2>출전 영웅</h2><div className="battle-briefing__heroes">{entries.map((entry) => <button key={entry.state.heroId} type="button" className={entry.state.heroId === selectedHeroId ? "battle-briefing__hero battle-briefing__hero--selected" : "battle-briefing__hero"} onClick={() => setSelectedHeroId(entry.state.heroId)}>{HERO_PORTRAIT[entry.definition.id] ? <img src={HERO_PORTRAIT[entry.definition.id]} alt="" /> : null}<span>{entry.definition.name}</span></button>)}</div><p className="battle-briefing__hint">영웅을 눌러 이번 전투의 선봉을 변경할 수 있습니다.</p></div>
          <div><h2>지역 정보</h2><div className="battle-briefing__enemy"><b>{typeInfo.label} 지형</b><span>적 세력 {tierInfo.factions - 1}개가 주둔 중입니다.</span></div><h2 className="mt-2">예상 이벤트</h2><div className="battle-briefing__events"><span>✦</span><p>탐험 이벤트가 전장 곳곳에 발생할 수 있습니다.</p></div></div>
        </div>
        <footer className="battle-briefing__footer"><span className={mapReady ? "battle-briefing__ready" : "battle-briefing__loading"}>{mapReady ? "전투 준비 완료" : loadingMessages[loadingStep]}</span><Button size="sm" onClick={() => onStart(selectedHeroId)} disabled={!mapReady}>전투 시작</Button></footer>
      </section>
    </div>
  );
}
