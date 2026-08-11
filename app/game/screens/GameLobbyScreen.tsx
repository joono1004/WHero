"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { PLAYER_FACTION_ID } from "../../../lib/game/faction.ts";
import type { Faction } from "../../../lib/game/faction.ts";
import { appointGovernor } from "../../../lib/game/governor.ts";
import { heroOverallGrade } from "../../../lib/game/hero-definition.ts";
import { governedWorldId, setDeploymentPriority } from "../../../lib/game/hero.ts";
import type { HeroState } from "../../../lib/game/hero.ts";
import { buildHeroListEntries } from "../../../lib/game/hero-roster.ts";
import type { HeroListEntry } from "../../../lib/game/hero-roster.ts";
import type { ClearedWorldRecord } from "../../../lib/game/world.ts";
import type { MapCandidate } from "../../../lib/game/map-candidates.ts";
import { upgradeResearch } from "../../../lib/game/research.ts";
import type { EconomyResearchKind } from "../../../lib/game/research.ts";
import type { SaveGame } from "../../../lib/game/save.ts";
import type { HeroId, UnitTypeId } from "../../../lib/game/ids.ts";
import { evolveUnitType, setActiveEvolution, upgradeTroopLevel } from "../../../lib/game/unit-evolution.ts";
import type { TroopLine } from "../../../lib/game/unit-production.ts";
import { MAX_ENLISTED_HEROES } from "../../../lib/game/world-entry.ts";
import type { MapTypeId } from "../../../lib/game/world.ts";
import { MAP_TIER_INFO, MAP_TYPE_INFO } from "../../../lib/game/world.ts";
import { Button } from "../Button.tsx";
import { GRADE_COLOR } from "../gradeColors.ts";
import { HERO_PORTRAIT } from "../heroPortraits.ts";
import { ScreenShell } from "../ScreenShell.tsx";
import { GovernorAppointScreen } from "./GovernorAppointScreen.tsx";
import { HeroEnlistScreen } from "./HeroEnlistScreen.tsx";
import { HeroRosterScreen } from "./HeroRosterScreen.tsx";
import { ResearchScreen } from "./ResearchScreen.tsx";
import { TroopsScreen } from "./TroopsScreen.tsx";

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
// bar instead of a plain text line. Order (목재/광석/금화/보석) matches the
// user's most recent header spec, not the FactionResources field order.
const RESOURCE_CHIPS: { key: "wood" | "iron" | "gold" | "gem"; icon: string; label: string; tint: string }[] = [
  { key: "wood", icon: "/art/lobby/resources/wood-v1.png", label: "목재", tint: "#a97c50" },
  { key: "iron", icon: "/art/lobby/resources/iron-v1.png", label: "철광", tint: "#9aa5a3" },
  { key: "gold", icon: "/art/lobby/resources/gold-v1.png", label: "금화", tint: "#d7b765" },
  { key: "gem", icon: "/art/lobby/resources/gem-v1.png", label: "보석", tint: "#c17be0" },
];

// Face-focused derivatives keep the representative hero readable in the compact HUD.
const LOBBY_REPRESENTATIVE_FACE: Partial<Record<HeroId, string>> = {
  "zhang-bao": "/art/heroes/zhang-bao-lobby-face-v1.png",
  "wei-yan": "/art/heroes/wei-yan-lobby-face-v1.png",
  "xu-shu": "/art/heroes/xu-shu-lobby-face-v1.png",
};

// "458.6K" style compact formatting for the header resource bar (2026-08-06
// direction) - real production isn't wired up yet so every value is 0
// today, but the header should already render however a future large
// number would look.
function formatResourceAmount(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

// Left sidebar menu (2026-08-06, replacing the earlier bottom-left
// horizontal bar per the user's full-screen wireframe: 영웅/병사/가방/연구/
// 순위/연맹). 연구/영웅/병사(2026-08-08 추가 - TroopsScreen) have a real
// destination so far - 가방/순위 are still placeholders, 연맹 is explicitly
// marked "예정" (planned) in the wireframe itself. Deliberately a plain
// array (not a Record) rendered via overflow-y-auto rather than a fixed
// height, since this list is expected to keep growing - a new entry is
// just another array item.
type MenuItemKey = "heroes" | "troops" | "bag" | "research" | "ranking" | "alliance";

const MENU_ITEMS: { key: MenuItemKey; icon: string; label: string }[] = [
  { key: "heroes", icon: "/art/lobby/sidebar-icons/heroes-v1.png", label: "영웅" },
  { key: "troops", icon: "/art/lobby/sidebar-icons/troops-v1.png", label: "병사" },
  { key: "bag", icon: "/art/lobby/sidebar-icons/bag-v1.png", label: "가방" },
  { key: "research", icon: "/art/lobby/sidebar-icons/research-v1.png", label: "연구" },
  { key: "ranking", icon: "/art/lobby/sidebar-icons/ranking-v1.png", label: "순위" },
  { key: "alliance", icon: "/art/lobby/sidebar-icons/alliance-v1.png", label: "연맹(예정)" },
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
  const [enlistingCandidateIndex, setEnlistingCandidateIndex] = useState<number | null>(null);
  const [appointingWorldId, setAppointingWorldId] = useState<string | null>(null);
  const [heroScreenOpen, setHeroScreenOpen] = useState(false);
  const [heroScreenInitialId, setHeroScreenInitialId] = useState<string | null>(null);
  const [showResearch, setShowResearch] = useState(false);
  const [showTroops, setShowTroops] = useState(false);
  const [systemMenuOpen, setSystemMenuOpen] = useState(false);
  const [systemGearSpin, setSystemGearSpin] = useState(0);
  // Message data will later supply these values; conditional badges are ready now.
  const unreadMailCount = 0;
  const unreadNoticeCount = 0;
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

  // Opens the combined roster+detail screen (2026-08-07) - `heroId` seeds
  // which hero the left-side card starts on (a formation slot click passes
  // its specific hero; the [영웅] menu button and an empty slot pass null,
  // which HeroRosterScreen falls back to its first sorted entry).
  const openHeroScreen = (heroId: string | null) => {
    setHeroScreenInitialId(heroId);
    setHeroScreenOpen(true);
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

  if (heroScreenOpen) {
    return (
      <HeroRosterScreen
        entries={entries}
        initialHeroId={heroScreenInitialId}
        onBack={() => setHeroScreenOpen(false)}
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
        faction={playerFaction}
        onBack={() => setShowResearch(false)}
        onUpgradeEconomy={(category: EconomyResearchKind) =>
          updateFaction((faction) => {
            const result = upgradeResearch(faction.research, faction.resources, category);
            return { ...faction, research: result.levels, resources: result.resources };
          })
        }
        onUpgradeTroop={(unitType: UnitTypeId) => updateFaction((faction) => upgradeTroopLevel(faction, unitType))}
        onEvolve={(unitType: UnitTypeId) => updateFaction((faction) => evolveUnitType(faction, unitType))}
      />
    );
  }

  if (showTroops && playerFaction) {
    return (
      <TroopsScreen
        faction={playerFaction}
        onBack={() => setShowTroops(false)}
        onSetActive={(line: TroopLine, unitType: UnitTypeId) =>
          updateFaction((faction) => setActiveEvolution(faction, line, unitType))
        }
      />
    );
  }

  const resources = playerFaction?.resources;
  // 대표 영웅 (2026-08-06 방향): 처음엔 항상 최초 선택한 영웅
  // (entries[0] - buildHeroListEntries가 save.heroes 순서를 그대로
  // 보존하고, heroes 배열은 계속 append만 되므로 heroes[0]은 언제나
  // "최초 선택한 영웅"을 가리킴). 나중에 영웅을 더 모으면 직접 다른
  // 영웅으로 바꾸고 테두리도 고를 수 있게 할 예정 - 그 선택 상태를 저장할
  // 필드가 아직 SaveGame에 없어서, 지금은 이 파생값 하나로 충분.
  const representativePortraitUrl = entries[0]
    ? (LOBBY_REPRESENTATIVE_FACE[entries[0].definition.id] ?? HERO_PORTRAIT[entries[0].definition.id])
    : undefined;

  return (
    <ScreenShell
      className="game-lobby-shell"
      header={
        <div className="lobby-header grid grid-cols-[auto_1fr_auto] items-center gap-2">
          {/* 세력명 블록 (2026-08-06 재배치): 대표 영웅 초상 + 이름/정복세계
              뱃지 + 칭호 3줄. 대표 영웅은 지금은 항상 heroes[0](최초 선택한
              영웅, entries가 save.heroes 순서를 그대로 보존하므로 안전) -
              사용자 방향: 나중에 영웅을 더 모으면 이 배지를 눌러서 대표로
              보여줄 영웅 + 테두리를 직접 고르는 시스템을 만들 예정(아직
              미착수, 지금은 클릭해도 안내만 뜸). 칭호도 마찬가지로 아직
              실제 시스템은 없는 placeholder. */}
          <div className="lobby-header__faction flex shrink-0 items-center gap-1.5">
            <button
              onClick={() => window.alert("아직 준비 중인 기능입니다.")}
              aria-label="대표 영웅 초상 선택"
              className="lobby-header__representative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden text-base"
              style={{ border: "2px solid #d7b765", backgroundColor: "#0b2028", backgroundImage: "none", padding: 0, cursor: "pointer" }}
            >
              {representativePortraitUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- local /public asset, same convention as HeroSelectScreen.tsx
                <img src={representativePortraitUrl} alt="대표 영웅 초상" className="h-full w-full object-cover" />
              ) : (
                "🧑"
              )}
            </button>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-[#f3dfaa]">{save.factionName}</span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                  style={{ border: "1px solid #d7b765", backgroundColor: "rgba(215,183,101,0.15)", color: "#d7b765" }}
                >
                  정복 세계 {clearedWorlds.length}
                </span>
              </div>
              {/* TODO(칭호 시스템 미정): 실제 칭호를 어떻게/언제 얻는지는
                  아직 설계 전 - 지금은 항상 이 문구만 보여줌. */}
              <p className="text-[9px] text-[#8fa6a8]">신입 지휘관</p>
            </div>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element -- cropped local title artwork */}
          <img className="lobby-header__logo justify-self-center" src="/art/lobby/title-logo-v4.png" alt="영웅스토리" />

          {/* 자원 줄 (2026-08-06 재배치): 가로 폭을 넓게 써서 목재/철광/
              금화/보석 순으로 펼쳐 보여주고, 보석 옆에 구매용 [+] -
              실제 상점/과금 연동은 미구현이라 눌러도 안내만 뜸. 오른쪽
              끝에 우편/알림(둘 다 신규 개념, 시스템 없음)·설정·닫기. */}
          <div className="lobby-header__right flex items-center justify-self-end gap-2">
            <div className="lobby-header__resources flex items-center gap-1">
              {RESOURCE_CHIPS.map(({ key, icon, label, tint }) => (
                <span
                  key={key}
                  className={`lobby-header__resource${key === "gem" ? " lobby-header__resource--gem" : ""} flex items-center gap-1 rounded-full py-0.5 pr-1.5 pl-0.5 text-[9px] font-bold`}
                  style={{ border: `1px solid ${tint}66`, backgroundColor: `${tint}14`, color: tint }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- local generated resource artwork */}
                  <img className="lobby-header__resource-icon" src={icon} alt={`${label} 아이콘`} />
                  <span className="lobby-header__resource-amount">{formatResourceAmount(resources?.[key] ?? 0)}</span>
                  {key === "gem" ? (
                    <button
                      type="button"
                      className="lobby-header__gem-plus"
                      onClick={() => window.alert("보석 구매 기능은 준비 중입니다.")}
                      aria-label="보석 구매"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- local generated UI artwork */}
                      <img src="/art/lobby/gem-plus-v1.png" alt="" />
                    </button>
                  ) : null}
                </span>
              ))}
              <button
                onClick={() => window.alert("아직 준비 중인 기능입니다.")}
                aria-label="보석 구매"
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ border: "1px solid #d7b765", backgroundColor: "rgba(215,183,101,0.15)", color: "#d7b765", cursor: "pointer" }}
              >
                +
              </button>
            </div>
            <div className="lobby-header__utility flex shrink-0 gap-1">
              <div className="lobby-system-menu">
                <button
                  type="button"
                  className="lobby-system-menu__trigger"
                  onClick={() => {
                    setSystemMenuOpen((open) => !open);
                    setSystemGearSpin((spin) => spin + 1);
                  }}
                  aria-label="시스템 메뉴"
                  aria-expanded={systemMenuOpen}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- local generated UI artwork */}
                  <img
                    className={systemGearSpin ? `lobby-system-menu__gear lobby-system-menu__gear--spin-${systemGearSpin % 2}` : "lobby-system-menu__gear"}
                    src="/art/lobby/system-settings-gear-v1.png"
                    alt=""
                  />
                </button>
                {systemMenuOpen ? (
                  <div className="lobby-system-menu__popup">
                    <button type="button" onClick={() => { setSystemMenuOpen(false); onSettings(); }}>설정</button>
                    <button type="button" className="lobby-system-menu__exit" onClick={onExitToMenu}>나가기</button>
                  </div>
                ) : null}
              </div>
              <Button size="sm" variant="secondary" className="lobby-header__utility-button lobby-header__utility-button--mail" data-unread={unreadMailCount || undefined} aria-label={unreadMailCount ? `읽지 않은 우편 ${unreadMailCount}개` : "우편"} onClick={() => window.alert("아직 준비 중인 기능입니다.")}>
                ✉️
              </Button>
              <Button size="sm" variant="secondary" className="lobby-header__utility-button lobby-header__utility-button--notice" data-unread={unreadNoticeCount || undefined} aria-label={unreadNoticeCount ? `읽지 않은 공지 ${unreadNoticeCount}개` : "공지 알림"} onClick={() => window.alert("아직 준비 중인 기능입니다.")}>
                🔔
              </Button>
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
    >
      {/* 전체 화면 구조 재배치 (2026-08-06, 사용자가 첨부한 전체 와이어프레임
          기준): 왼쪽 세로 메뉴 열 + 오른쪽 세계/출전영웅 열, 2컬럼 구성으로
          바꿈. 이전엔 ScreenShell footer에 가로 메뉴 바가 있었는데, 이번
          와이어프레임엔 그 자리가 없어서 footer prop 자체를 더 이상 안 씀
          (ScreenShell은 footer를 안 넘기면 그 영역을 렌더링하지 않으므로
          별도 처리 불필요). 출전 영웅 5슬롯도 순서상 세계 영역 위에서
          아래로 옮김. */}
      <div className="flex h-full gap-2 py-1">
        {/* 왼쪽 열: 세로 메뉴(영웅/병사/가방/연구/순위/연맹) + 광고배너 +
            채팅창. 메뉴는 항목이 계속 늘 수 있어 overflow-y-auto - 가로
            메뉴 바 때와 같은 이유(그때는 overflow-x-auto)로 고정 개수를
            가정하지 않음. */}
        <div className="flex w-48 shrink-0 flex-col gap-1.5">
          <div className="flex w-24 flex-1 flex-col gap-1 overflow-y-auto">
            {MENU_ITEMS.map((item) => (
              <MenuBarButton
                key={item.key}
                icon={item.icon}
                label={item.label}
                onClick={() => {
                  if (item.key === "research") setShowResearch(true);
                  else if (item.key === "troops") setShowTroops(true);
                  else if (item.key === "heroes") openHeroScreen(null);
                  else window.alert("아직 준비 중인 기능입니다.");
                }}
              />
            ))}
          </div>
          <AdBannerPlaceholder />
          <ChatPlaceholder />
        </div>

        {/* 오른쪽 열: 세계 선택 레일(기존 그대로, 더 크게) + 출전 영웅
            5슬롯(기존 그대로, 위치만 아래로). */}
        <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
          <div className="flex flex-1 flex-col gap-1 overflow-hidden">
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

        <div className="lobby-formation-footer flex shrink-0 items-center gap-2">
          {/* 출전 영웅 5슬롯: ★로 표시된(deploymentPriority) 영웅을 우선순위
              순으로 채움 - 세계 진입 시 실제로 어떤 5명이 나가는지와는
              별개로(그건 HeroEnlistScreen에서 그때그때 고름), "다음에
              출전시킬 생각인 주전"을 로비에서 한눈에 보여주는 용도. 빈
              슬롯은 ➕로 표시되고 누르면 전체 로스터(HeroRosterScreen)로
              이동해서 별을 찍을 수 있음. */}
          <div className="lobby-formation-bar flex min-w-0 flex-1 items-center gap-1.5">
            <span className="shrink-0 text-[10px] text-[#8fa6a8]">출전 영웅</span>
            {Array.from({ length: MAX_ENLISTED_HEROES }, (_, index) =>
              entries.filter((entry) => entry.state.deploymentPriority)[index],
            ).map((entry, index) =>
              entry ? (
                <FormationSlot key={entry.state.heroId} entry={entry} onClick={() => openHeroScreen(entry.state.heroId)} />
              ) : (
                <button
                  key={index}
                  onClick={() => openHeroScreen(null)}
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
          <button
            type="button"
            className="lobby-sortie-button shrink-0"
            onClick={() => window.alert("먼저 공략할 세계를 선택하세요.")}
          >
            출정 시작
          </button>
        </div>
        </div>
      </div>
    </ScreenShell>
  );
}

// Compact icon+label row (2026-08-06, switched from an icon-tile-with-
// label-below stack to fit a narrow vertical sidebar): the old stacked
// layout was sized for a horizontal bar and only fit ~3 of 6 items in the
// sidebar's available height before needing a scroll. A single-line row
// fits all 6 comfortably while still leaving room to grow further (scrolls
// via the parent's overflow-y-auto once it doesn't).
function MenuBarButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lobby-sidebar__menu-button flex w-full shrink-0 items-center gap-1 text-left"
      style={{
        border: "none",
        borderRadius: 0,
        padding: "0 7px",
        backgroundImage: "none",
        boxShadow: "none",
        color: "#f4e1af",
        fontWeight: 400,
        cursor: "pointer",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- local generated HUD icon */}
      <img src={icon} alt="" className="lobby-sidebar__menu-icon shrink-0" />
      <span className="lobby-sidebar__menu-label truncate text-[9px] font-bold">{label}</span>
    </button>
  );
}

// Reserved spot for a future ad placement (2026-08-06 wireframe: "광고
// 베너") - no ad SDK/network wired up, just a placeholder tile in the left
// column above the chat window.
function AdBannerPlaceholder() {
  return (
    <button
      onClick={() => window.alert("아직 준비 중인 기능입니다.")}
      className="flex h-8 w-24 shrink-0 items-center justify-center rounded-md text-[9px]"
      style={{
        border: "1px dashed #43606a",
        background: "none",
        backgroundImage: "none",
        color: "#5c7276",
        fontWeight: 400,
        cursor: "pointer",
      }}
    >
      광고
    </button>
  );
}

// Reserved spot for a future chat window (2026-08-06 wireframe: "채팅창
// (배경 투명), 메시지 표시는 두줄, 입력창 한줄") - real chat needs a server/
// networking layer that doesn't exist yet, so this only reserves the UI
// shape (transparent background, two placeholder message lines, one
// disabled input line) for Codex/a later networking pass to wire up.
function ChatPlaceholder() {
  return (
    <div className="lobby-recent-chat">
      <div className="lobby-recent-chat__messages">
        <p><b>알림</b> 영웅스토리에 오신 것을 환영합니다.</p>
        <p><b>홍길동</b> 우리 연맹에 가입하세요...</p>
      </div>
      <button
        type="button"
        className="lobby-recent-chat__launch"
        aria-label="채팅 열기"
        onClick={() => window.alert("사용자 간 채팅 창은 준비 중입니다.")}
      >
        💬
      </button>
    </div>
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
