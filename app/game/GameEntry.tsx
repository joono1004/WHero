"use client";

import { useEffect, useState } from "react";
import { createNewSaveGame } from "../../lib/game/new-game.ts";
import type { SaveGame } from "../../lib/game/save.ts";
import {
  deleteSaveGame,
  listSaveSlots,
  readSaveGame,
  writeSaveGame,
} from "../../lib/game/storage.ts";
import type { KeyValueStorage, SaveSlotSummary } from "../../lib/game/storage.ts";
import { foundCity } from "../../lib/game/city-actions.ts";
import { PLAYER_FACTION_ID } from "../../lib/game/faction.ts";
import { assignHeroToCity } from "../../lib/game/hero.ts";
import { endTurn } from "../../lib/game/turn.ts";
import { completeActiveWorld, enterMapCandidate } from "../../lib/game/world-entry.ts";
import { captureEnemyCity, surrenderRivalFaction } from "../../lib/game/world-progress.ts";
import { FactionNameScreen } from "./screens/FactionNameScreen.tsx";
import { GameLobbyScreen } from "./screens/GameLobbyScreen.tsx";
import { HeroSelectScreen } from "./screens/HeroSelectScreen.tsx";
import { MainMenuScreen } from "./screens/MainMenuScreen.tsx";
import { MapPlayScreen } from "./screens/MapPlayScreen.tsx";
import { SaveSlotListScreen } from "./screens/SaveSlotListScreen.tsx";
import { TitleScreen } from "./screens/TitleScreen.tsx";
import { WorldGeneratingScreen } from "./screens/WorldGeneratingScreen.tsx";

type Screen =
  | { name: "title" }
  | { name: "menu" }
  | { name: "load-list"; slots: SaveSlotSummary[] }
  | { name: "faction-name" }
  | { name: "hero-select"; factionName: string }
  | { name: "generating"; factionName: string; heroId: string }
  | { name: "main"; slotId: string; save: SaveGame };

const GENERATING_DELAY_MS = 600;

export function GameEntry() {
  const [screen, setScreen] = useState<Screen>({ name: "title" });
  // localStorage doesn't exist during server-side render; a lazy initializer
  // runs once per render environment, so this is `null` on the server and
  // the real localStorage from the first client render onward - no effect
  // (and no post-mount setState) needed to pick it up.
  const [storage] = useState<KeyValueStorage | null>(() =>
    typeof window === "undefined" ? null : window.localStorage,
  );

  useEffect(() => {
    if (screen.name !== "generating" || !storage) return;
    const { factionName, heroId } = screen;
    const timeout = setTimeout(() => {
      const save = createNewSaveGame({
        factionName,
        heroId,
        seed: Math.floor(Math.random() * 99999999),
        now: new Date().toISOString(),
      });
      const slotId = `slot-${Date.now()}`;
      writeSaveGame(storage, slotId, save);
      setScreen({ name: "main", slotId, save });
    }, GENERATING_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [screen, storage]);

  switch (screen.name) {
    case "title":
      return <TitleScreen onStart={() => setScreen({ name: "menu" })} />;

    case "menu":
      return (
        <MainMenuScreen
          onNewGame={() => setScreen({ name: "faction-name" })}
          onContinue={() => setScreen({ name: "load-list", slots: storage ? listSaveSlots(storage) : [] })}
          onSettings={() => window.alert("설정 화면은 아직 만들어지지 않았습니다.")}
          onExit={() => window.alert("이 창을 닫아 게임을 종료할 수 있습니다.")}
        />
      );

    case "load-list":
      return (
        <SaveSlotListScreen
          slots={screen.slots}
          onBack={() => setScreen({ name: "menu" })}
          onLoad={(slotId) => {
            if (!storage) return;
            const result = readSaveGame(storage, slotId);
            if (result.ok) {
              setScreen({ name: "main", slotId, save: result.save });
            } else {
              window.alert("이 저장 데이터를 불러올 수 없습니다 (손상되었거나 지원하지 않는 버전).");
            }
          }}
          onDelete={(slotId) => {
            if (!storage) return;
            deleteSaveGame(storage, slotId);
            setScreen({ name: "load-list", slots: listSaveSlots(storage) });
          }}
        />
      );

    case "faction-name":
      return (
        <FactionNameScreen
          onBack={() => setScreen({ name: "menu" })}
          onSubmit={(factionName) => setScreen({ name: "hero-select", factionName })}
        />
      );

    case "hero-select":
      return (
        <HeroSelectScreen
          onBack={() => setScreen({ name: "faction-name" })}
          onConfirm={(heroId) => setScreen({ name: "generating", factionName: screen.factionName, heroId })}
        />
      );

    case "generating":
      return <WorldGeneratingScreen />;

    case "main": {
      const slotId = screen.slotId;
      const updateSave = (updated: SaveGame) => {
        if (!storage) return;
        const withTimestamp = { ...updated, updatedAt: new Date().toISOString() };
        writeSaveGame(storage, slotId, withTimestamp);
        setScreen({ name: "main", slotId, save: withTimestamp });
      };

      if (screen.save.world) {
        return (
          <MapPlayScreen
            save={screen.save}
            onExitToMenu={() => setScreen({ name: "menu" })}
            onCompleteWorld={() => updateSave(completeActiveWorld(screen.save, new Date().toISOString()))}
            onEndTurn={() => updateSave(endTurn(screen.save, new Date().toISOString()))}
            onFoundCity={(heroId, position) => {
              const cityNumber = Object.keys(screen.save.cities).length + 1;
              try {
                updateSave(foundCity(screen.save, heroId, position, `주둔지 ${cityNumber}`, new Date().toISOString()));
              } catch (error) {
                window.alert(error instanceof Error ? error.message : "주둔지를 건설할 수 없습니다.");
              }
            }}
            onStationHero={(heroId, cityId) => {
              const city = screen.save.cities[cityId];
              if (!city) return;
              updateSave({
                ...screen.save,
                heroes: screen.save.heroes.map((hero) => (hero.heroId === heroId ? assignHeroToCity(hero, cityId) : hero)),
                cities: { ...screen.save.cities, [cityId]: { ...city, heroId } },
              });
            }}
            onCaptureCity={(cityId) => {
              try {
                updateSave(captureEnemyCity(screen.save, cityId, PLAYER_FACTION_ID, new Date().toISOString()));
              } catch (error) {
                window.alert(error instanceof Error ? error.message : "도시를 점령할 수 없습니다.");
              }
            }}
            onSurrenderFaction={(factionId) => {
              try {
                updateSave(surrenderRivalFaction(screen.save, factionId, new Date().toISOString()));
              } catch (error) {
                window.alert(error instanceof Error ? error.message : "세력을 항복시킬 수 없습니다.");
              }
            }}
          />
        );
      }

      return (
        <GameLobbyScreen
          save={screen.save}
          onExitToMenu={() => setScreen({ name: "menu" })}
          onUpdateSave={updateSave}
          onEnterCandidate={(candidateIndex, enlistedHeroIds) =>
            updateSave(enterMapCandidate(screen.save, candidateIndex, enlistedHeroIds, new Date().toISOString()))
          }
        />
      );
    }
  }
}
