"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { CITY_TIER_INFO } from "../../../lib/game/city.ts";
import {
  isFactionEliminated,
  PLAYER_FACTION_ID,
} from "../../../lib/game/faction.ts";
import { isHeroSolo } from "../../../lib/game/hero.ts";
import { findHeroDefinition } from "../../../lib/game/hero-roster.ts";
import type { SaveGame } from "../../../lib/game/save.ts";
import { MAP_TIER_INFO, MAP_TYPE_INFO } from "../../../lib/game/world.ts";
import type { HexDiagnostic } from "../../../lib/world/model/world-map";
import { Button } from "../Button.tsx";
import { ScreenShell } from "../ScreenShell.tsx";

const GameWorldMap = dynamic(
  () =>
    import("../../../components/world/GameWorldMap").then(
      (module) => module.GameWorldMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="game-map-loading" role="status">
        <strong>월드 렌더러를 불러오고 있습니다</strong>
      </div>
    ),
  },
);

const compactActionStyle = {
  border: "1px solid #43606a",
  borderRadius: 3,
  background: "none",
  backgroundImage: "none",
  padding: "2px 5px",
  fontSize: "9px",
  color: "#b8c7c5",
} as const;

export function MapPlayScreen({
  save,
  onExitToMenu,
  onCompleteWorld,
  onEndTurn,
  onFoundCity,
  onStationHero,
  onCaptureCity,
  onSurrenderFaction,
}: {
  save: SaveGame;
  onExitToMenu: () => void;
  onCompleteWorld: () => void;
  onEndTurn: () => void;
  onFoundCity: (heroId: string, position: { row: number; column: number }) => void;
  onStationHero: (heroId: string, cityId: string) => void;
  onCaptureCity: (cityId: string) => void;
  onSurrenderFaction: (factionId: string) => void;
}) {
  const [selectedHex, setSelectedHex] = useState<HexDiagnostic | null>(null);
  const world = save.world;

  const handleHexSelected = useCallback((diagnostic: HexDiagnostic) => {
    setSelectedHex(diagnostic);
  }, []);

  if (!world) return null;

  const typeInfo = MAP_TYPE_INFO[world.generation.mapType];
  const tierInfo = MAP_TIER_INFO[world.generation.mapTier];
  const playerFaction = save.factions[PLAYER_FACTION_ID];
  const cities = playerFaction
    ? playerFaction.cityIds.map((id) => save.cities[id]).filter(Boolean)
    : [];
  const founder = save.heroes.find((hero) => isHeroSolo(hero));
  const summonedCount = save.heroes.filter(
    (hero) =>
      world.enlistedHeroIds.includes(hero.heroId) &&
      hero.assignment.mode !== "enlisted",
  ).length;
  const rivalFactions = world.factionIds
    .filter((id) => id !== world.playerFactionId)
    .map((id) => save.factions[id])
    .filter((faction): faction is NonNullable<typeof faction> => Boolean(faction));
  const defeatedRivalCount = rivalFactions.filter(isFactionEliminated).length;
  const canFoundAtSelection = Boolean(
    founder &&
      selectedHex &&
      selectedHex.kind === "land" &&
      !selectedHex.structure,
  );

  return (
    <ScreenShell
      header={
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-[#e3ce94]">
            {world.worldIndex}번째 세계
            <span className="text-[#8fa6a8]"> · {typeInfo.label} · {tierInfo.label}</span>
          </span>
          <span className="text-[10px] text-[#8fa6a8]">
            출전 영웅 {summonedCount}/{world.enlistedHeroIds.length}명 · 적 세력 {defeatedRivalCount}/{rivalFactions.length} 격파
          </span>
          <Button size="sm" variant="secondary" onClick={onExitToMenu}>
            메뉴
          </Button>
        </div>
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={onCompleteWorld}
              disabled={!world.conquered}
            >
              정복 완료
            </Button>
            {founder && (
              <Button
                size="sm"
                variant="secondary"
                disabled={!canFoundAtSelection}
                onClick={() => {
                  if (!selectedHex) return;
                  onFoundCity(founder.heroId, {
                    row: selectedHex.row,
                    column: selectedHex.column,
                  });
                }}
              >
                선택한 칸에 거점 건설
              </Button>
            )}
            <span className="text-[9px] text-[#8fa6a8]">
              {selectedHex
                ? `선택 ${selectedHex.row}, ${selectedHex.column} · ${selectedHex.kind === "land" ? selectedHex.terrain : selectedHex.kind}`
                : "지도에서 육각형을 선택하세요"}
            </span>
          </div>
          <span className="text-[10px] text-[#8fa6a8]">{world.turn}턴</span>
          <Button size="sm" onClick={onEndTurn}>
            턴 종료
          </Button>
        </div>
      }
    >
      <div className="flex h-full min-h-0 gap-2 py-1">
        <aside className="flex w-36 shrink-0 flex-col gap-1 overflow-y-auto rounded-md border border-[#43606a] bg-[#17343e] p-1.5">
          <p className="text-[10px] font-bold text-[#8fa6a8]">내 도시 ({cities.length})</p>
          {cities.length === 0 && (
            <p className="text-[9px] text-[#5f7a80]">선택한 육지에 첫 거점을 건설하세요.</p>
          )}
          {cities.map((city) => {
            const stationed = city.heroId ? findHeroDefinition(city.heroId) : null;
            return (
              <div key={city.id} className="rounded p-1 text-[9px]" style={{ border: "1px solid #274049" }}>
                <p className="font-bold text-[#f3dfaa]">{city.name}</p>
                <p className="text-[#8fa6a8]">
                  {CITY_TIER_INFO[city.tier].label} · 시설 {city.facilities.length}/{CITY_TIER_INFO[city.tier].facilitySlots}
                </p>
                {stationed ? (
                  <p className="text-[#d9bd74]">배속: {stationed.name}</p>
                ) : (
                  founder && (
                    <button
                      type="button"
                      onClick={() => onStationHero(founder.heroId, city.id)}
                      className="mt-0.5"
                      style={compactActionStyle}
                    >
                      영웅 배속
                    </button>
                  )
                )}
              </div>
            );
          })}
        </aside>

        <section className="min-w-0 flex-1 overflow-hidden rounded-md border border-[#43606a] bg-[#10272e]">
          <GameWorldMap
            seed={world.generation.seed}
            mapTierId={world.generation.mapTier}
            mapTypeId={world.generation.mapType}
            turn={world.turn}
            onHexSelected={handleHexSelected}
          />
        </section>

        <aside className="flex w-36 shrink-0 flex-col gap-1 overflow-y-auto rounded-md border border-[#43606a] bg-[#17343e] p-1.5">
          <p className="text-[10px] font-bold text-[#8fa6a8]">적 세력 ({rivalFactions.length})</p>
          {rivalFactions.map((faction) => {
            const eliminated = isFactionEliminated(faction);
            return (
              <div key={faction.id} className="rounded p-1 text-[9px]" style={{ border: "1px solid #274049" }}>
                <p className="font-bold text-[#f3dfaa]">{faction.name}</p>
                {eliminated ? (
                  <p className="text-[#8fa6a8]">
                    격파됨{faction.eliminationReason === "surrendered" ? " (항복)" : ""}
                  </p>
                ) : (
                  <div className="mt-1 flex flex-col gap-1">
                    {faction.capitalCityId && (
                      <button
                        type="button"
                        onClick={() => onCaptureCity(faction.capitalCityId!)}
                        style={compactActionStyle}
                      >
                        수도 점령 시험
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onSurrenderFaction(faction.id)}
                      style={compactActionStyle}
                    >
                      항복 처리 시험
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </aside>
      </div>
    </ScreenShell>
  );
}
