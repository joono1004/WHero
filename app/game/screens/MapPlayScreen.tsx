"use client";

import { CITY_TIER_INFO } from "../../../lib/game/city.ts";
import { isFactionEliminated, PLAYER_FACTION_ID } from "../../../lib/game/faction.ts";
import { isHeroSolo } from "../../../lib/game/hero.ts";
import { findHeroDefinition } from "../../../lib/game/hero-roster.ts";
import type { SaveGame } from "../../../lib/game/save.ts";
import { MAP_TIER_INFO, MAP_TYPE_INFO } from "../../../lib/game/world.ts";
import { Button } from "../Button.tsx";
import { ScreenShell } from "../ScreenShell.tsx";

// The actual game screen (task 6 correction): only rendered once the player
// has entered a map candidate from the lobby (GameLobbyScreen). Turn end and
// the real hex map both live here, not in the lobby. The map itself is
// Codex's territory (app/world-prototype.tsx) and isn't wired in yet - the
// center panel is a clearly-labeled placeholder until that integration
// point is agreed on (docs/SYSTEM_LAYER.md). "주둔지 건설 (테스트)",
// "적 수도 점령 (테스트)", and "적 세력 항복 (테스트)" are temporary
// stand-ins for real movement/combat (task 8's terrain-integrated movement
// and a map-driven "attack a city" trigger don't reach the map yet) so the
// lobby <-> map-play <-> city <-> cleared-rail loop can be exercised
// end-to-end without waiting on Codex's map/terrain engine; all three
// should be removed once real trigger conditions exist. The surrender
// button in particular has no real decision logic behind it at all (task
// 12's user direction defers "when should an AI surrender" pending an
// AI-power system) - clicking it always succeeds, standing in for both the
// missing map AND the missing AI decision at once. Turn end, city founding,
// and city capture/surrender themselves are real
// (lib/game/turn.ts, lib/game/city-actions.ts, lib/game/world-progress.ts)
// even though there's no map to click on yet. "정복 완료" (no longer
// "(테스트)", task 12) is real too now - it's gated on world.conquered
// (every rival faction defeated, by capture or surrender), not free to
// click at any time like before.
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
  const world = save.world;
  if (!world) return null;

  const typeInfo = MAP_TYPE_INFO[world.generation.mapType];
  const tierInfo = MAP_TIER_INFO[world.generation.mapTier];
  const playerFaction = save.factions[PLAYER_FACTION_ID];
  const cities = playerFaction ? playerFaction.cityIds.map((id) => save.cities[id]).filter(Boolean) : [];
  const founder = save.heroes.find((hero) => isHeroSolo(hero));
  const summonedCount = save.heroes.filter(
    (hero) => world.enlistedHeroIds.includes(hero.heroId) && hero.assignment.mode !== "enlisted",
  ).length;
  const rivalFactions = world.factionIds
    .filter((id) => id !== world.playerFactionId)
    .map((id) => save.factions[id])
    .filter((faction): faction is NonNullable<typeof faction> => Boolean(faction));
  const defeatedRivalCount = rivalFactions.filter(isFactionEliminated).length;

  return (
    <ScreenShell
      header={
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#e3ce94]">
            {world.worldIndex}번째 세계 <span className="text-[#8fa6a8]">· {typeInfo.label} · {tierInfo.label}</span>
          </span>
          <span className="text-[10px] text-[#8fa6a8]">
            출전 영웅 {summonedCount}/{world.enlistedHeroIds.length}명 · 적 세력 {defeatedRivalCount}/{rivalFactions.length} 격파
          </span>
          <Button size="sm" variant="secondary" onClick={onExitToMenu}>
            ✕
          </Button>
        </div>
      }
      footer={
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={onCompleteWorld} disabled={!world.conquered}>
              정복 완료
            </Button>
            {founder && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onFoundCity(founder.heroId, { row: 0, column: (cities.length + 1) * 4 })}
              >
                주둔지 건설 (테스트)
              </Button>
            )}
          </div>
          <span className="text-[10px] text-[#8fa6a8]">{world.turn}턴차</span>
          <Button size="sm" onClick={onEndTurn}>
            턴 종료
          </Button>
        </div>
      }
    >
      <div className="flex h-full gap-2 py-1">
        <div className="flex w-36 shrink-0 flex-col gap-1 overflow-y-auto rounded-md border border-[#43606a] bg-[#17343e] p-1.5">
          <p className="text-[10px] font-bold text-[#8fa6a8]">내 도시 ({cities.length})</p>
          {cities.length === 0 && <p className="text-[9px] text-[#5f7a80]">아직 없음</p>}
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
                      onClick={() => onStationHero(founder.heroId, city.id)}
                      className="mt-0.5"
                      style={{
                        border: "1px solid #43606a",
                        borderRadius: 3,
                        background: "none",
                        backgroundImage: "none",
                        padding: "1px 4px",
                        fontSize: "9px",
                        color: "#8fa6a8",
                      }}
                    >
                      영웅 배속 (테스트)
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
        <div className="flex w-36 shrink-0 flex-col gap-1 overflow-y-auto rounded-md border border-[#43606a] bg-[#17343e] p-1.5">
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
                  <div className="mt-0.5 flex flex-col gap-0.5">
                    {faction.capitalCityId && (
                      <button
                        onClick={() => onCaptureCity(faction.capitalCityId!)}
                        style={{
                          border: "1px solid #43606a",
                          borderRadius: 3,
                          background: "none",
                          backgroundImage: "none",
                          padding: "1px 4px",
                          fontSize: "9px",
                          color: "#8fa6a8",
                        }}
                      >
                        적 수도 점령 (테스트)
                      </button>
                    )}
                    <button
                      onClick={() => onSurrenderFaction(faction.id)}
                      style={{
                        border: "1px solid #43606a",
                        borderRadius: 3,
                        background: "none",
                        backgroundImage: "none",
                        padding: "1px 4px",
                        fontSize: "9px",
                        color: "#8fa6a8",
                      }}
                    >
                      적 세력 항복 (테스트)
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div
          className="flex h-full flex-1 items-center justify-center rounded-md text-center text-xs text-[#8fa6a8]"
          style={{ border: "1px dashed #43606a" }}
        >
          세계 지도 영역
          <br />
          (world-prototype.tsx 연동 예정)
        </div>
      </div>
    </ScreenShell>
  );
}
