"use client";

import { useEffect, useRef, useState } from "react";
import { PLAYER_FACTION_ID } from "../../../lib/game/faction.ts";
import type { Faction } from "../../../lib/game/faction.ts";
import { appointGovernor } from "../../../lib/game/governor.ts";
import { heroArchetype, heroOverallGrade } from "../../../lib/game/hero-definition.ts";
import { governedWorldId, setDeploymentPriority, unequipItem } from "../../../lib/game/hero.ts";
import type { HeroState } from "../../../lib/game/hero.ts";
import {
  buildHeroListEntries,
  compareByArchetype,
  compareByGrade,
  compareByLevel,
} from "../../../lib/game/hero-roster.ts";
import type { HeroListEntry } from "../../../lib/game/hero-roster.ts";
import type { ClearedWorldRecord } from "../../../lib/game/world.ts";
import type { MapCandidate } from "../../../lib/game/map-candidates.ts";
import { upgradeResearch } from "../../../lib/game/research.ts";
import type { ResearchCategory } from "../../../lib/game/research.ts";
import type { SaveGame } from "../../../lib/game/save.ts";
import { MAP_TIER_INFO, MAP_TIER_ORDER, MAP_TYPE_INFO } from "../../../lib/game/world.ts";
import { Button } from "../Button.tsx";
import { ARCHETYPE_LABEL } from "../heroLabels.ts";
import { HERO_PORTRAIT } from "../heroPortraits.ts";
import { ScreenShell } from "../ScreenShell.tsx";
import { GovernorAppointScreen } from "./GovernorAppointScreen.tsx";
import { HeroDetailScreen } from "./HeroDetailScreen.tsx";
import { HeroEnlistScreen } from "./HeroEnlistScreen.tsx";
import { ResearchScreen } from "./ResearchScreen.tsx";

type SortMode = "grade" | "archetype" | "level";

const SORT_COMPARATORS: Record<SortMode, (a: HeroListEntry, b: HeroListEntry) => number> = {
  grade: compareByGrade,
  archetype: compareByArchetype,
  level: compareByLevel,
};

const SORT_LABEL: Record<SortMode, string> = {
  grade: "등급",
  archetype: "유형",
  level: "레벨",
};

// A cleared world's display name - the player-given one (governor.ts's
// appointGovernor) once set, otherwise "세계 N" (2026-08-06: the user
// settled on "세계" as the term for this concept, replacing the earlier
// "N번째 세계" phrasing everywhere in this screen).
function worldLabel(record: { worldIndex: number; name?: string | null }): string {
  return record.name ?? `세계 ${record.worldIndex}`;
}

// The lobby (task 6, corrected): between worlds, the player picks the next
// map to challenge here rather than landing straight in a live map. Turn
// end and the actual hex map live in MapPlayScreen, which only renders once
// `save.world` is non-null (see GameEntry.tsx's routing and this session's
// lobby/map-candidate correction in docs/GAME_VISION.md).
export function GameLobbyScreen({
  save,
  onExitToMenu,
  onUpdateSave,
  onEnterCandidate,
  onSettings,
}: {
  save: SaveGame;
  onExitToMenu: () => void;
  onUpdateSave: (save: SaveGame) => void;
  onEnterCandidate: (candidateIndex: number, enlistedHeroIds: string[]) => void;
  onSettings: () => void;
}) {
  const [sortMode, setSortMode] = useState<SortMode>("grade");
  const [viewingHeroId, setViewingHeroId] = useState<string | null>(null);
  const [showResearch, setShowResearch] = useState(false);
  const [enlistingCandidateIndex, setEnlistingCandidateIndex] = useState<number | null>(null);
  const [appointingWorldId, setAppointingWorldId] = useState<string | null>(null);
  const railRef = useRef<HTMLDivElement>(null);

  const playerFaction = save.factions[PLAYER_FACTION_ID];
  const entries = buildHeroListEntries(save.heroes).sort(SORT_COMPARATORS[sortMode]);
  const clearedWorlds = Object.values(save.clearedWorlds).sort((a, b) => a.worldIndex - b.worldIndex);

  // Keep the newly-offered world candidates in view by default rather than
  // requiring a scroll every visit - they always sit at the right end of
  // the rail (cleared history first, then candidates), so scrolling all the
  // way right surfaces them. Re-runs whenever the rail's contents change
  // (a world was just cleared, or the very first mount).
  useEffect(() => {
    const rail = railRef.current;
    if (rail) rail.scrollLeft = rail.scrollWidth;
  }, [clearedWorlds.length, save.nextMapCandidates.length]);

  const scrollRail = (direction: -1 | 1) => {
    railRef.current?.scrollBy({ left: direction * 180, behavior: "smooth" });
  };

  const updateHero = (heroId: string, updater: (hero: HeroState) => HeroState) => {
    onUpdateSave({
      ...save,
      heroes: save.heroes.map((hero) => (hero.heroId === heroId ? updater(hero) : hero)),
    });
  };

  const updateFaction = (updater: (faction: Faction) => Faction) => {
    const faction = save.factions[PLAYER_FACTION_ID];
    if (!faction) return;
    onUpdateSave({
      ...save,
      factions: { ...save.factions, [PLAYER_FACTION_ID]: updater(faction) },
    });
  };

  const governorLabelFor = (hero: HeroState) => {
    const worldId = governedWorldId(hero);
    if (!worldId) return null;
    const region = save.clearedWorlds[worldId];
    return region ? `${worldLabel(region)} 영주` : "영주";
  };

  if (viewingHeroId) {
    const viewing = entries.find((entry) => entry.state.heroId === viewingHeroId);
    if (viewing) {
      return (
        <HeroDetailScreen
          hero={viewing.state}
          definition={viewing.definition}
          governorLabel={governorLabelFor(viewing.state)}
          onBack={() => setViewingHeroId(null)}
          onToggleDeploymentPriority={() =>
            updateHero(viewing.state.heroId, (hero) => setDeploymentPriority(hero, !hero.deploymentPriority))
          }
          onUnequipItem={(itemId) => updateHero(viewing.state.heroId, (hero) => unequipItem(hero, itemId))}
        />
      );
    }
    setViewingHeroId(null);
  }

  if (enlistingCandidateIndex !== null) {
    return (
      <HeroEnlistScreen
        entries={entries}
        onBack={() => setEnlistingCandidateIndex(null)}
        onConfirm={(enlistedHeroIds) => onEnterCandidate(enlistingCandidateIndex, enlistedHeroIds)}
      />
    );
  }

  if (appointingWorldId) {
    const region = save.clearedWorlds[appointingWorldId];
    if (region) {
      return (
        <GovernorAppointScreen
          entries={entries}
          worldLabel={worldLabel(region)}
          existingName={region.name}
          onBack={() => setAppointingWorldId(null)}
          onConfirm={(heroId, name) => {
            onUpdateSave(appointGovernor(save, appointingWorldId, heroId, name));
            setAppointingWorldId(null);
          }}
        />
      );
    }
    setAppointingWorldId(null);
  }

  if (showResearch && playerFaction) {
    return (
      <ResearchScreen
        research={playerFaction.research}
        resources={playerFaction.resources}
        onBack={() => setShowResearch(false)}
        onUpgrade={(category: ResearchCategory) =>
          updateFaction((faction) => {
            const result = upgradeResearch(faction.research, faction.resources, category);
            return { ...faction, research: result.levels, resources: result.resources };
          })
        }
      />
    );
  }

  const resources = playerFaction?.resources;

  return (
    <ScreenShell
      header={
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#e3ce94]">
              {save.factionName} <span className="text-[#8fa6a8]">정복 세계 {clearedWorlds.length}</span>
            </span>
            <span className="hidden text-[10px] tracking-[0.2em] text-[#8fa6a8] sm:block">HERO STORY</span>
            <div className="flex gap-1">
              <Button size="sm" variant="secondary" onClick={onSettings}>
                ⚙
              </Button>
              <Button size="sm" variant="secondary" onClick={onExitToMenu}>
                ✕
              </Button>
            </div>
          </div>
          {/* 영주 배치로 얻는 자원 (2026-08-06 방향) - 실시간 생산 로직은
              아직 미구현이라 지금은 항상 0/0이지만, FactionResources에 실제
              필드가 있으니 나중에 생산이 붙으면 이 줄이 자동으로 반영됨. */}
          <p className="text-[9px] text-[#8fa6a8]">
            금화 {resources?.gold ?? 0} · 목재 {resources?.wood ?? 0} · 광석 {resources?.iron ?? 0} · 보석{" "}
            {resources?.gem ?? 0}
          </p>
        </div>
      }
      footer={
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => window.alert("로비에는 활성화된 세계가 없어 부대가 없습니다. 세계에 진출하면 그 화면에서 확인할 수 있습니다.")}>
              부대
            </Button>
            <Button size="sm" variant="secondary" onClick={() => window.alert("로비에는 활성화된 세계가 없어 도시가 없습니다. 세계에 진출하면 그 화면에서 확인할 수 있습니다.")}>
              도시
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowResearch(true)}>
              연구
            </Button>
          </div>
          <span className="text-[10px] text-[#8fa6a8]">
            금 {resources?.gold ?? 0} · 식량 {resources?.food ?? 0} · 유산 {resources?.researchResource ?? 0}
          </span>
        </div>
      }
    >
      <div className="flex h-full gap-2 py-1">
        <aside className="flex w-44 shrink-0 flex-col rounded-md border border-[#43606a] bg-[#17343e]">
          <div className="flex shrink-0 gap-1 border-b border-[#43606a] p-1">
            {(Object.keys(SORT_LABEL) as SortMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className="flex-1 text-center"
                style={{
                  borderRadius: 4,
                  border: `1px solid ${sortMode === mode ? "#d7b765" : "#43606a"}`,
                  backgroundColor: sortMode === mode ? "#1c3b44" : "transparent",
                  backgroundImage: "none",
                  color: sortMode === mode ? "#d7b765" : "#8fa6a8",
                  fontWeight: 400,
                  padding: "2px 0",
                  fontSize: "10px",
                }}
              >
                {SORT_LABEL[mode]}순
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-1">
            {entries.length === 0 && <p className="p-2 text-center text-[10px] text-[#8fa6a8]">영웅이 없습니다.</p>}
            {entries.map(({ state, definition }) => {
              const grade = heroOverallGrade(definition.attributes);
              const archetype = heroArchetype(definition.attributes);
              const governorLabel = governorLabelFor(state);
              const portraitUrl = HERO_PORTRAIT[definition.id];
              return (
                <div
                  key={state.heroId}
                  role="button"
                  tabIndex={0}
                  onClick={() => setViewingHeroId(state.heroId)}
                  onKeyDown={(event) => event.key === "Enter" && setViewingHeroId(state.heroId)}
                  className="mb-1 flex cursor-pointer items-center gap-1.5 rounded p-1"
                  style={{ border: "1px solid #274049" }}
                >
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      updateHero(state.heroId, (hero) => setDeploymentPriority(hero, !hero.deploymentPriority));
                    }}
                    title="출전 우선 표시"
                    className="shrink-0"
                    style={{
                      border: "none",
                      background: "none",
                      backgroundImage: "none",
                      padding: 0,
                      fontSize: "12px",
                      color: state.deploymentPriority ? "#d7b765" : "#43606a",
                    }}
                  >
                    {state.deploymentPriority ? "★" : "☆"}
                  </button>
                  {/* 영웅 초상 자리 (2026-08-06, 텍스트 뱃지 -> 초상 프레임) -
                      HeroSelectScreen과 같은 HERO_PORTRAIT 맵을 공유하므로
                      아트가 등록되는 즉시 여기도 자동으로 반영됨. */}
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded"
                    style={{ border: "1px solid #43606a", backgroundColor: "#0b2028" }}
                  >
                    {portraitUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- local /public asset, same convention as HeroSelectScreen.tsx
                      <img src={portraitUrl} alt={`${definition.name} 초상`} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm text-[#43606a]">🧑</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-bold text-[#f3dfaa]">{definition.name}</p>
                    <p className="truncate text-[9px] text-[#8fa6a8]">
                      {grade}급 · {ARCHETYPE_LABEL[archetype]} · Lv.{state.level}
                    </p>
                    {governorLabel && <p className="truncate text-[9px] text-[#d9bd74]">{governorLabel}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
          <p className="shrink-0 text-[10px] text-[#8fa6a8]">공략할 세계를 선택하세요</p>
          <div className="flex flex-1 items-stretch gap-1 overflow-hidden">
            <RailArrowButton direction="left" onClick={() => scrollRail(-1)} />
            <div ref={railRef} className="flex flex-1 items-stretch gap-2 overflow-x-auto scroll-smooth pb-1">
              {clearedWorlds.map((record) => (
                <ClearedWorldChip
                  key={record.id}
                  record={record}
                  onAppointGovernor={() => setAppointingWorldId(record.id)}
                />
              ))}
              {save.nextMapCandidates.map((candidate, index) => (
                <MapCandidateCard
                  key={`${candidate.worldIndex}-${candidate.generation.mapType}-${index}`}
                  candidate={candidate}
                  onEnter={() => setEnlistingCandidateIndex(index)}
                />
              ))}
            </div>
            <RailArrowButton direction="right" onClick={() => scrollRail(1)} />
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}

function RailArrowButton({ direction, onClick }: { direction: "left" | "right"; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={direction === "left" ? "이전 세계 보기" : "다음 세계 보기"}
      className="flex shrink-0 items-center justify-center"
      style={{
        width: 20,
        borderRadius: 4,
        border: "1px solid #43606a",
        backgroundColor: "#17343e",
        backgroundImage: "none",
        color: "#8fa6a8",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {direction === "left" ? "‹" : "›"}
    </button>
  );
}

// A cleared world's chip in the history rail - the rail grows to the left
// as more worlds are cleared (oldest first, newest sitting right next to
// the current candidates), with < >/drag navigation for older entries once
// it overflows. Clicking an ungoverned world opens the appoint-governor
// screen (governor.ts's appointGovernor); an already-governed one just
// shows who's ruling it (changing governors isn't supported yet).
function ClearedWorldChip({
  record,
  onAppointGovernor,
}: {
  record: ClearedWorldRecord;
  onAppointGovernor: () => void;
}) {
  const typeInfo = MAP_TYPE_INFO[record.generation.mapType];
  const tierInfo = MAP_TIER_INFO[record.generation.mapTier];
  const isGoverned = record.governorHeroId !== null;

  const body = (
    <>
      {/* Codex 지형 아트 자리 (2026-08-06) - 티어가 높을수록 살짝 커지도록
          해서 "정복한 세계가 많을수록 큰 세계가 보인다"는 방향을 아트가
          없는 지금도 시각적으로 어느 정도 드러나게 함. 실제 지형 이미지가
          들어오면 이 자리를 그대로 배경/썸네일로 교체하면 됨. */}
      <TerrainArtPlaceholder tier={record.generation.mapTier} />
      <p className="mt-1 truncate font-bold text-[#c0cbc7]">{worldLabel(record)}</p>
      <p className="truncate text-[#8fa6a8]">
        {typeInfo.label} · {tierInfo.label}
      </p>
      <p className="mt-0.5 whitespace-nowrap text-[#5f7a80]">정복 완료</p>
      {isGoverned ? (
        <p className="mt-0.5 truncate text-[#d9bd74]">영주 있음</p>
      ) : (
        <p className="mt-0.5 whitespace-nowrap text-[#6ea8e0]">임명 가능</p>
      )}
    </>
  );

  if (isGoverned) {
    return (
      <div
        className="flex w-28 shrink-0 flex-col justify-start rounded-md p-2 text-[9px]"
        style={{ border: "1px solid #43606a", backgroundColor: "#132a31", color: "#8fa6a8" }}
      >
        {body}
      </div>
    );
  }

  return (
    <button
      onClick={onAppointGovernor}
      className="flex w-28 shrink-0 flex-col justify-start rounded-md p-2 text-left text-[9px]"
      style={{
        border: "1px solid #43606a",
        backgroundColor: "#132a31",
        backgroundImage: "none",
        color: "#8fa6a8",
        fontWeight: 400,
        cursor: "pointer",
      }}
    >
      {body}
    </button>
  );
}

// A challengeable candidate: exactly 1 on a fresh game, 2 (distinct terrain)
// after each clear - see lib/game/map-candidates.ts. Map size (tier) is
// never a choice here, only terrain type is.
function MapCandidateCard({ candidate, onEnter }: { candidate: MapCandidate; onEnter: () => void }) {
  const typeInfo = MAP_TYPE_INFO[candidate.generation.mapType];
  const tierInfo = MAP_TIER_INFO[candidate.generation.mapTier];
  return (
    <div
      className="flex w-40 shrink-0 flex-col justify-between rounded-md p-2"
      style={{ border: "1px solid #bd9b4c", backgroundColor: "#1c3b44" }}
    >
      <div>
        <div className="flex justify-center">
          <TerrainArtPlaceholder tier={candidate.generation.mapTier} />
        </div>
        <p className="mt-1 text-xs font-bold text-[#f3dfaa]">{typeInfo.label}</p>
        <p className="mt-0.5 text-[9px] text-[#8fa6a8]">{typeInfo.description}</p>
      </div>
      <div className="mt-2 text-[9px] text-[#c0cbc7]">
        <p>
          세계 {candidate.worldIndex} · {tierInfo.label}
        </p>
        <p>적 세력 {tierInfo.factions}개</p>
      </div>
      <Button size="sm" className="mt-2" onClick={onEnter}>
        이 세계로 진출
      </Button>
    </div>
  );
}

// Reserved space for Codex's per-region terrain art (2026-08-06 lobby
// redesign direction - "처음 로비에 왔을때는... 평지의 소형 지형 이미지가
// 보일꺼야", art itself TBD). Box grows a little with map tier so "bigger
// tier = bigger world" reads visually even before real art exists.
function TerrainArtPlaceholder({ tier }: { tier: keyof typeof MAP_TIER_INFO }) {
  const tierIndex = MAP_TIER_ORDER.indexOf(tier);
  const size = 56 + tierIndex * 8;
  return (
    <div
      className="mx-auto flex items-center justify-center rounded border border-dashed text-[8px]"
      style={{ width: size, height: size, borderColor: "#3a4f52", color: "#5c7276" }}
    >
      지형
    </div>
  );
}
