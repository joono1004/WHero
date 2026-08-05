"use client";

import { useState } from "react";
import { PLAYER_FACTION_ID } from "../../../lib/game/faction.ts";
import type { Faction } from "../../../lib/game/faction.ts";
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
import { MAP_TIER_INFO, MAP_TYPE_INFO } from "../../../lib/game/world.ts";
import { Button } from "../Button.tsx";
import { ARCHETYPE_LABEL } from "../heroLabels.ts";
import { ScreenShell } from "../ScreenShell.tsx";
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
}: {
  save: SaveGame;
  onExitToMenu: () => void;
  onUpdateSave: (save: SaveGame) => void;
  onEnterCandidate: (candidateIndex: number, enlistedHeroIds: string[]) => void;
}) {
  const [sortMode, setSortMode] = useState<SortMode>("grade");
  const [viewingHeroId, setViewingHeroId] = useState<string | null>(null);
  const [showResearch, setShowResearch] = useState(false);
  const [enlistingCandidateIndex, setEnlistingCandidateIndex] = useState<number | null>(null);

  const playerFaction = save.factions[PLAYER_FACTION_ID];
  const entries = buildHeroListEntries(save.heroes).sort(SORT_COMPARATORS[sortMode]);
  const clearedWorlds = Object.values(save.clearedWorlds).sort((a, b) => a.worldIndex - b.worldIndex);

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
    return region ? `${region.worldIndex}번째 세계 영주` : "영주";
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

  return (
    <ScreenShell
      header={
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#e3ce94]">
            {save.factionName} <span className="text-[#8fa6a8]">Lv.{playerFaction?.level ?? 1}</span>
          </span>
          <span className="hidden text-[10px] tracking-[0.2em] text-[#8fa6a8] sm:block">HERO STORY</span>
          <div className="flex gap-1">
            <Button size="sm" variant="secondary" onClick={() => window.alert("설정 화면은 아직 만들어지지 않았습니다.")}>
              ⚙
            </Button>
            <Button size="sm" variant="secondary" onClick={onExitToMenu}>
              ✕
            </Button>
          </div>
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
            금 {playerFaction?.resources.gold ?? 0} · 식량 {playerFaction?.resources.food ?? 0} · 유산{" "}
            {playerFaction?.resources.researchResource ?? 0}
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
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ border: "1px solid #43606a", backgroundColor: "#0b2028", color: "#d7b765" }}
                  >
                    {definition.name.slice(0, 1)}
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
          <div className="flex flex-1 items-stretch gap-2 overflow-x-auto pb-1">
            {clearedWorlds.map((record) => (
              <ClearedWorldChip key={record.id} record={record} />
            ))}
            {save.nextMapCandidates.map((candidate, index) => (
              <MapCandidateCard
                key={`${candidate.worldIndex}-${candidate.generation.mapType}-${index}`}
                candidate={candidate}
                onEnter={() => setEnlistingCandidateIndex(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}

// A slim, non-interactive chip for an already-cleared world. The rail these
// sit in grows to the left as more worlds are cleared (oldest first, newest
// sitting right next to the current candidates) - this session's explicit
// direction for how conquest history should read.
function ClearedWorldChip({ record }: { record: ClearedWorldRecord }) {
  const typeInfo = MAP_TYPE_INFO[record.generation.mapType];
  const tierInfo = MAP_TIER_INFO[record.generation.mapTier];
  return (
    <div
      className="flex w-24 shrink-0 flex-col justify-between rounded-md p-2 text-[9px]"
      style={{ border: "1px solid #43606a", backgroundColor: "#132a31", color: "#8fa6a8" }}
    >
      <p className="font-bold text-[#c0cbc7]">{record.worldIndex}번째 세계</p>
      <p>{typeInfo.label}</p>
      <p>{tierInfo.label}</p>
      <p className="text-[#5f7a80]">정복 완료</p>
    </div>
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
        <p className="text-xs font-bold text-[#f3dfaa]">{typeInfo.label}</p>
        <p className="mt-0.5 text-[9px] text-[#8fa6a8]">{typeInfo.description}</p>
      </div>
      <div className="mt-2 text-[9px] text-[#c0cbc7]">
        <p>
          {candidate.worldIndex}번째 세계 · {tierInfo.label}
        </p>
        <p>적 세력 {tierInfo.factions}개</p>
      </div>
      <Button size="sm" className="mt-2" onClick={onEnter}>
        이 세계로 진출
      </Button>
    </div>
  );
}
