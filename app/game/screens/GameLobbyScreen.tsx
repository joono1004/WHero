"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { PLAYER_FACTION_ID } from "../../../lib/game/faction.ts";
import type { Faction } from "../../../lib/game/faction.ts";
import { appointGovernor } from "../../../lib/game/governor.ts";
import { heroOverallGrade } from "../../../lib/game/hero-definition.ts";
import { governedWorldId, setDeploymentPriority, unequipItem } from "../../../lib/game/hero.ts";
import type { HeroState } from "../../../lib/game/hero.ts";
import { buildHeroListEntries } from "../../../lib/game/hero-roster.ts";
import type { HeroListEntry } from "../../../lib/game/hero-roster.ts";
import type { ClearedWorldRecord } from "../../../lib/game/world.ts";
import type { MapCandidate } from "../../../lib/game/map-candidates.ts";
import { upgradeResearch } from "../../../lib/game/research.ts";
import type { ResearchCategory } from "../../../lib/game/research.ts";
import type { SaveGame } from "../../../lib/game/save.ts";
import { MAX_ENLISTED_HEROES } from "../../../lib/game/world-entry.ts";
import type { MapTypeId } from "../../../lib/game/world.ts";
import { MAP_TIER_INFO, MAP_TYPE_INFO } from "../../../lib/game/world.ts";
import { Button } from "../Button.tsx";
import { GRADE_COLOR } from "../gradeColors.ts";
import { HERO_PORTRAIT } from "../heroPortraits.ts";
import { ScreenShell } from "../ScreenShell.tsx";
import { GovernorAppointScreen } from "./GovernorAppointScreen.tsx";
import { HeroDetailScreen } from "./HeroDetailScreen.tsx";
import { HeroEnlistScreen } from "./HeroEnlistScreen.tsx";
import { HeroRosterScreen } from "./HeroRosterScreen.tsx";
import { ResearchScreen } from "./ResearchScreen.tsx";

// Terrain flavor for the world orbs (2026-08-06, "게임스럽게" visual pass) -
// an emoji + tint color per map type, standing in for Codex's eventual
// terrain art. Icon/tint choices only, not gameplay data - see
// docs/CLAUDE_HANDOFF.md's "로비 화면 재배치" note for what Codex needs
// when replacing these with real art.
const MAP_TYPE_ICON: Record<MapTypeId, string> = {
  inland: "🌾",
  continent: "🌍",
  archipelago: "🏝️",
  highlands: "⛰️",
  riverlands: "🏞️",
};

const MAP_TYPE_TINT: Record<MapTypeId, string> = {
  inland: "#8fbc5a",
  continent: "#6ea8e0",
  archipelago: "#4fc3c9",
  highlands: "#b5a58f",
  riverlands: "#5fb0c4",
};

// One row per resource the lobby header shows (2026-08-06 direction) -
// icon + tint turns "금화 0 · 목재 0 · ..." into a proper HUD-style resource
// bar instead of a plain text line.
const RESOURCE_CHIPS: { key: "gold" | "wood" | "iron" | "gem"; icon: string; label: string; tint: string }[] = [
  { key: "gold", icon: "🪙", label: "금화", tint: "#d7b765" },
  { key: "wood", icon: "🪵", label: "목재", tint: "#a97c50" },
  { key: "iron", icon: "⛏️", label: "광석", tint: "#9aa5a3" },
  { key: "gem", icon: "💎", label: "보석", tint: "#c17be0" },
];

// Bottom-left menu bar (2026-08-06 direction, replacing the old 부대/도시/
// 연구 footer buttons): only 연구/영웅 have a real destination so far -
// 상점/병사/아이템 are placeholders. Deliberately a plain array (not a
// Record) rendered via overflow-x-auto rather than fitting to a fixed
// width, since the user expects this list to grow past 5 items later - a
// new entry is just another array item, no layout rework needed.
type MenuItemKey = "research" | "shop" | "heroes" | "troops" | "items";

const MENU_ITEMS: { key: MenuItemKey; icon: string; label: string }[] = [
  { key: "research", icon: "📜", label: "연구" },
  { key: "shop", icon: "🏪", label: "상점" },
  { key: "heroes", icon: "🛡️", label: "영웅" },
  { key: "troops", icon: "⚔️", label: "병사" },
  { key: "items", icon: "🎒", label: "아이템" },
];

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
  const [viewingHeroId, setViewingHeroId] = useState<string | null>(null);
  const [enlistingCandidateIndex, setEnlistingCandidateIndex] = useState<number | null>(null);
  const [appointingWorldId, setAppointingWorldId] = useState<string | null>(null);
  const [showHeroRoster, setShowHeroRoster] = useState(false);
  const [showResearch, setShowResearch] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

  const playerFaction = save.factions[PLAYER_FACTION_ID];
  const entries = buildHeroListEntries(save.heroes);
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

  if (showHeroRoster) {
    return (
      <HeroRosterScreen
        entries={entries}
        onBack={() => setShowHeroRoster(false)}
        onSelectHero={(heroId) => {
          setShowHeroRoster(false);
          setViewingHeroId(heroId);
        }}
        onToggleDeploymentPriority={(heroId) =>
          updateHero(heroId, (hero) => setDeploymentPriority(hero, !hero.deploymentPriority))
        }
        governorLabelFor={governorLabelFor}
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

  const resources = playerFaction?.resources;

  return (
    <ScreenShell
      header={
        <div
          className="grid grid-cols-3 items-center rounded-md p-1.5"
          style={{
            border: "1px solid rgba(215,183,101,0.3)",
            backgroundImage: "linear-gradient(180deg, rgba(215,183,101,0.14), rgba(215,183,101,0.02))",
          }}
        >
          <div className="flex items-center gap-1.5 justify-self-start">
            {/* 참고 이미지의 세력 초상 배지 자리 - 실제 세력 문장/초상 아트는
                아직 없어서 방패 이모지로 대체 (2026-08-06). */}
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs"
              style={{ border: "2px solid #d7b765", backgroundColor: "#0b2028" }}
            >
              🛡️
            </span>
            <div>
              <span className="text-xs font-bold text-[#f3dfaa]">{save.factionName}</span>
              <span
                className="ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                style={{ border: "1px solid #d7b765", backgroundColor: "rgba(215,183,101,0.15)", color: "#d7b765" }}
              >
                정복 세계 {clearedWorlds.length}
              </span>
            </div>
          </div>
          <span className="hidden justify-self-center text-[10px] tracking-[0.2em] text-[#8fa6a8] sm:block">
            HERO STORY
          </span>
          {/* 영주 배치로 얻는 자원 (2026-08-06 방향) - 실시간 생산 로직은
              아직 미구현이라 지금은 항상 0/0이지만, FactionResources에 실제
              필드가 있으니 나중에 생산이 붙으면 이 칩들이 자동으로 반영됨.
              아이콘을 작은 원형 배지로 감싸서(참고 이미지의 자원 아이콘
              스타일) 텍스트 옆 이모지보다 무게감 있게 보이도록 함. */}
          <div className="flex items-center justify-self-end gap-1.5">
            <div className="flex gap-1">
              {RESOURCE_CHIPS.map(({ key, icon, tint }) => (
                <span
                  key={key}
                  className="flex items-center gap-1 rounded-full py-0.5 pr-1.5 pl-0.5 text-[9px] font-bold"
                  style={{ border: `1px solid ${tint}66`, backgroundColor: `${tint}14`, color: tint }}
                >
                  <span
                    className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px]"
                    style={{ backgroundColor: `${tint}33`, border: `1px solid ${tint}` }}
                  >
                    {icon}
                  </span>
                  <span>{resources?.[key] ?? 0}</span>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="secondary" onClick={onSettings}>
                ⚙
              </Button>
              <Button size="sm" variant="secondary" onClick={onExitToMenu}>
                ✕
              </Button>
            </div>
          </div>
        </div>
      }
      footer={
        <div className="flex gap-1.5 overflow-x-auto">
          {MENU_ITEMS.map((item) => (
            <MenuBarButton
              key={item.key}
              icon={item.icon}
              label={item.label}
              onClick={() => {
                if (item.key === "research") setShowResearch(true);
                else if (item.key === "heroes") setShowHeroRoster(true);
                else window.alert("아직 준비 중인 기능입니다.");
              }}
            />
          ))}
        </div>
      }
    >
      <div className="flex h-full flex-col gap-1.5 py-1">
        {/* 출전 영웅 5슬롯 (2026-08-06, 상시 노출 리스트 -> 컴팩트 편성 바로
            대체): ★로 표시된(deploymentPriority) 영웅을 우선순위 순으로
            채움 - 세계 진입 시 실제로 어떤 5명이 나가는지와는 별개로(그건
            HeroEnlistScreen에서 그때그때 고름), "다음에 출전시킬 생각인
            주전"을 로비에서 한눈에 보여주는 용도. 빈 슬롯은 🔒로 표시되고
            누르면 전체 로스터(HeroRosterScreen)로 이동해서 별을 찍을 수
            있음. 깊은 관리(등급 상향, 아이템 장착 등)는 [영웅] 메뉴 버튼
            뒤의 HeroRosterScreen/HeroDetailScreen으로 이동. */}
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-[10px] text-[#8fa6a8]">출전 영웅</span>
          {Array.from({ length: MAX_ENLISTED_HEROES }, (_, index) =>
            entries.filter((entry) => entry.state.deploymentPriority)[index],
          ).map((entry, index) =>
            entry ? (
              <FormationSlot key={entry.state.heroId} entry={entry} onClick={() => setViewingHeroId(entry.state.heroId)} />
            ) : (
              <button
                key={index}
                onClick={() => setShowHeroRoster(true)}
                aria-label="영웅 로스터 열기"
                className="flex shrink-0 flex-col items-center gap-0.5"
                style={{ border: "none", background: "none", backgroundImage: "none", padding: 0, cursor: "pointer" }}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-sm"
                  style={{ border: "2px dashed #3a4f52", color: "#5c7276" }}
                >
                  ➕
                </span>
                <span className="text-[8px] text-[#5c7276]">빈 자리</span>
              </button>
            ),
          )}
        </div>

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

// Icon sits in its own small tile, label below outside the tile - mirrors
// the reference image's menu icons (a distinct icon badge + a caption under
// it) rather than icon+label sharing one bordered box.
function MenuBarButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex shrink-0 flex-col items-center gap-0.5"
      style={{
        border: "none",
        background: "none",
        backgroundImage: "none",
        padding: 0,
        color: "#c0cbc7",
        fontWeight: 400,
        cursor: "pointer",
      }}
    >
      <span
        className="flex h-8 w-8 items-center justify-center rounded-lg text-base"
        style={{
          border: "1px solid #bd9b4c",
          backgroundImage: "linear-gradient(160deg, #2c4a40, #16302b)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {icon}
      </span>
      <span className="text-[9px] font-bold">{label}</span>
    </button>
  );
}

// Name label under the portrait (2026-08-06, matching the reference
// image's named formation avatars) - previously just a bare portrait with
// a hover title.
function FormationSlot({ entry, onClick }: { entry: HeroListEntry; onClick: () => void }) {
  const grade = heroOverallGrade(entry.definition.attributes);
  const portraitUrl = HERO_PORTRAIT[entry.definition.id];
  return (
    <button
      onClick={onClick}
      className="flex shrink-0 flex-col items-center gap-0.5"
      style={{ border: "none", background: "none", backgroundImage: "none", padding: 0, cursor: "pointer" }}
    >
      <span
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full"
        style={{
          border: `2px solid ${GRADE_COLOR[grade]}`,
          backgroundColor: "#0b2028",
          boxShadow: `0 0 6px ${GRADE_COLOR[grade]}77`,
        }}
      >
        {portraitUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local /public asset, same convention as HeroSelectScreen.tsx
          <img src={portraitUrl} alt={`${entry.definition.name} 초상`} className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm text-[#43606a]">🧑</span>
        )}
      </span>
      <span className="max-w-10 truncate text-[8px] font-bold text-[#c0cbc7]">{entry.definition.name}</span>
    </button>
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

// Shared card shell (2026-08-06, matching a reference screenshot the user
// shared: cleared-world and new-candidate cards are all the same size/
// format there, differing only by content/status text, not by size or
// prominence tier - previously cleared-world chips were a visibly smaller,
// muted "second class" card). `highlight` gives the gold, glowing border
// reserved for cards the player can act on right now (an ungoverned
// cleared world, or any new candidate); a governed world (nothing left to
// do here) gets the plain muted border instead.
function WorldCardShell({
  highlight,
  onClick,
  children,
}: {
  highlight: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  const style: CSSProperties = {
    border: `1px solid ${highlight ? "#bd9b4c" : "#43606a"}`,
    backgroundImage: "linear-gradient(160deg, #24404a, #142a30)",
    boxShadow: highlight
      ? "0 4px 14px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)"
      : "0 2px 8px rgba(0,0,0,0.3)",
  };
  if (!onClick) {
    return (
      <div className="flex w-36 shrink-0 flex-col overflow-hidden rounded-lg" style={style}>
        {children}
      </div>
    );
  }
  return (
    <button
      onClick={onClick}
      className="flex w-36 shrink-0 flex-col overflow-hidden rounded-lg text-left"
      style={{ ...style, backgroundColor: "transparent", color: "inherit", fontWeight: 400, cursor: "pointer" }}
    >
      {children}
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

  return (
    <WorldCardShell highlight={!isGoverned} onClick={isGoverned ? undefined : onAppointGovernor}>
      <TerrainArt mapType={record.generation.mapType} muted={isGoverned} />
      <div className="p-2 text-[9px]" style={{ color: "#8fa6a8" }}>
        <p className="truncate font-bold text-[#c0cbc7]">{worldLabel(record)}</p>
        <p className="truncate">
          {typeInfo.label} · {tierInfo.label}
        </p>
        <p className="mt-0.5 whitespace-nowrap text-[#5f7a80]">정복 완료</p>
        {isGoverned ? (
          <p className="mt-0.5 truncate text-[#d9bd74]">영주 있음</p>
        ) : (
          <p className="mt-0.5 whitespace-nowrap text-[#6ea8e0]">임명 가능</p>
        )}
      </div>
    </WorldCardShell>
  );
}

// A challengeable candidate: exactly 1 on a fresh game, 2 (distinct terrain)
// after each clear - see lib/game/map-candidates.ts. Map size (tier) is
// never a choice here, only terrain type is.
function MapCandidateCard({ candidate, onEnter }: { candidate: MapCandidate; onEnter: () => void }) {
  const typeInfo = MAP_TYPE_INFO[candidate.generation.mapType];
  const tierInfo = MAP_TIER_INFO[candidate.generation.mapTier];
  return (
    <WorldCardShell highlight>
      <TerrainArt mapType={candidate.generation.mapType} />
      <div className="flex flex-1 flex-col justify-between p-2">
        <div>
          <p className="text-center text-xs font-bold text-[#f3dfaa]">{typeInfo.label}</p>
          <p className="mt-0.5 text-center text-[9px] text-[#8fa6a8]">{typeInfo.description}</p>
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
    </WorldCardShell>
  );
}

// Reserved space for Codex's per-region terrain art (2026-08-06 lobby
// redesign direction - "처음 로비에 왔을때는... 평지의 소형 지형 이미지가
// 보일꺼야", real art itself TBD - see docs/CLAUDE_HANDOFF.md). A full-width
// panel across the top of the card (not a small centered circle) so it
// reads as a thumbnail/art frame the way the reference screenshot's world
// cards do - once Codex has real art, this is the spot it replaces. `muted`
// dims it for the cleared-world history rail once a world is governed
// (nothing left to act on there).
function TerrainArt({ mapType, muted = false }: { mapType: MapTypeId; muted?: boolean }) {
  const tint = MAP_TYPE_TINT[mapType];
  return (
    <div
      className="flex h-16 items-center justify-center text-3xl"
      style={{
        backgroundImage: `radial-gradient(circle at 30% 25%, ${tint}${muted ? "33" : "55"}, #0b2028 80%)`,
        borderBottom: `2px solid ${muted ? `${tint}66` : tint}`,
        opacity: muted ? 0.8 : 1,
      }}
    >
      {MAP_TYPE_ICON[mapType]}
    </div>
  );
}
