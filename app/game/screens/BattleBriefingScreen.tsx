"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { HeroState } from "../../../lib/game/hero.ts";
import { buildHeroListEntries } from "../../../lib/game/hero-roster.ts";
import type { MapCandidate } from "../../../lib/game/map-candidates.ts";
import { MAP_TIER_INFO, MAP_TYPE_INFO } from "../../../lib/game/world.ts";
import type { HexDiagnostic } from "../../../lib/world/model/world-map";
import { Button } from "../Button.tsx";
import { HERO_PORTRAIT } from "../heroPortraits.ts";

const GameWorldMap = dynamic(() => import("../../../components/world/GameWorldMap").then((module) => module.GameWorldMap), { ssr: false });

export function BattleBriefingScreen({ candidate, heroes, initialHeroId, onBack, onStart }: {
  candidate: MapCandidate;
  heroes: HeroState[];
  initialHeroId: string;
  onBack: () => void;
  onStart: (heroId: string) => void;
}) {
  const [selectedHeroId, setSelectedHeroId] = useState(initialHeroId);
  const [mapReady, setMapReady] = useState(false);
  const entries = buildHeroListEntries(heroes);
  const typeInfo = MAP_TYPE_INFO[candidate.generation.mapType];
  const tierInfo = MAP_TIER_INFO[candidate.generation.mapTier];
  const onHexSelected = (_diagnostic: HexDiagnostic) => undefined;

  return (
    <div className="battle-briefing">
      <div className="battle-briefing__map" aria-hidden="true">
        <GameWorldMap seed={candidate.generation.seed} mapTierId={candidate.generation.mapTier} mapTypeId={candidate.generation.mapType} turn={1} onHexSelected={onHexSelected} onReady={() => setMapReady(true)} />
      </div>
      <div className="battle-briefing__shade" />
      <section className="battle-briefing__panel">
        <header className="battle-briefing__header"><span>전투 브리핑</span><Button size="sm" variant="secondary" onClick={onBack}>돌아가기</Button></header>
        <div className="battle-briefing__body">
          <div className="battle-briefing__mission"><strong>{candidate.worldIndex}번째 세계 · {typeInfo.label}</strong><span>{tierInfo.label} 규모의 전장</span><p>목표: 적 성을 점령하여 이 나라를 정복하세요.</p></div>
          <div className="battle-briefing__grid">
            <div><h2>출전 영웅</h2><div className="battle-briefing__heroes">{entries.map((entry) => <button key={entry.state.heroId} type="button" className={entry.state.heroId === selectedHeroId ? "battle-briefing__hero battle-briefing__hero--selected" : "battle-briefing__hero"} onClick={() => setSelectedHeroId(entry.state.heroId)}>{HERO_PORTRAIT[entry.definition.id] ? <img src={HERO_PORTRAIT[entry.definition.id]} alt="" /> : null}<span>{entry.definition.name}</span></button>)}</div><p className="battle-briefing__hint">영웅을 눌러 이번 전투의 선봉을 변경할 수 있습니다.</p></div>
            <div><h2>적 세력</h2><div className="battle-briefing__enemy"><b>적 세력 {tierInfo.factions - 1}</b><span>적 성 점령 시 승리</span></div><h2 className="mt-2">예상 이벤트</h2><div className="battle-briefing__events"><span>?</span><p>탐험 이벤트가 전장 곳곳에 발생할 수 있습니다.</p></div></div>
          </div>
        </div>
        <footer className="battle-briefing__footer"><span className={mapReady ? "battle-briefing__ready" : "battle-briefing__loading"}>{mapReady ? "전장 준비 완료" : "전장 생성 중..."}</span><Button size="sm" onClick={() => onStart(selectedHeroId)} disabled={!mapReady}>전투 시작</Button></footer>
      </section>
    </div>
  );
}
