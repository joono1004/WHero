"use client";

import { useEffect, useState } from "react";
import { GameErrorBoundary } from "./GameErrorBoundary.tsx";
import { reportClientError } from "./reportError.ts";
import {
  backupSaveSlot,
  ensureGuestSession,
  getAccountStatus,
  linkAccountWithEmail,
  listCloudBackups,
  restoreCloudBackup,
  signInWithEmail,
  signOutAccount,
} from "./account.ts";
import type { AccountStatus, CloudBackupSummary } from "./account.ts";
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
import { SettingsScreen } from "./screens/SettingsScreen.tsx";
import { TitleScreen } from "./screens/TitleScreen.tsx";
import { WorldGeneratingScreen } from "./screens/WorldGeneratingScreen.tsx";

type Screen =
  | { name: "title" }
  | { name: "menu" }
  | { name: "load-list"; slots: SaveSlotSummary[] }
  | { name: "settings" }
  | { name: "faction-name" }
  | { name: "hero-select"; factionName: string }
  | { name: "generating"; factionName: string; heroId: string }
  | { name: "main"; slotId: string; save: SaveGame };

const AUTO_BACKUP_KEY = "whero:auto-backup";

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
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  // Same lazy-initializer trick as `storage` above: reads localStorage once,
  // on the client, without needing an effect just to seed this from it.
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(() =>
    typeof window === "undefined" ? false : window.localStorage.getItem(AUTO_BACKUP_KEY) === "true",
  );
  const [cloudBackups, setCloudBackups] = useState<CloudBackupSummary[] | null>(null);

  // Every player gets an invisible anonymous session so a save has a stable
  // cloud identity from the start; nothing is uploaded until the player
  // explicitly links a real account in Settings (see account.ts).
  useEffect(() => {
    if (!storage) return;
    void ensureGuestSession().then(() => getAccountStatus()).then(setAccountStatus);
  }, [storage]);

  // Refreshes account/cloud-backup state whenever Settings is opened, so it
  // reflects a link/sign-in that may have happened moments ago.
  useEffect(() => {
    if (screen.name !== "settings") return;
    void getAccountStatus().then(setAccountStatus);
    void listCloudBackups().then(setCloudBackups);
  }, [screen.name]);

  function maybeAutoBackup(slotId: string, save: SaveGame) {
    if (!autoBackupEnabled || accountStatus?.linked !== true) return;
    void backupSaveSlot(slotId, save).then((result) => {
      if (!result.ok) reportClientError(result.error, { screen: "main", action: "autoBackup" });
    });
  }

  // Registering or signing in defaults auto-backup to on - the player just
  // proved they want their data in the cloud, so make that useful right
  // away rather than requiring a second trip to flip the checkbox.
  function enableAutoBackup() {
    setAutoBackupEnabled(true);
    storage?.setItem(AUTO_BACKUP_KEY, "true");
  }

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

  // Catches errors outside the render tree (event handlers, timeouts,
  // rejected promises) that GameErrorBoundary below can't see - it only
  // catches render-time errors. Re-registered whenever the screen changes
  // (cheap - just two listeners) so the reported context always names the
  // screen that was active when the error happened.
  useEffect(() => {
    function handleError(event: ErrorEvent) {
      reportClientError(event.error ?? event.message, {
        screen: screen.name,
        action: "window.onerror",
      });
    }
    function handleRejection(event: PromiseRejectionEvent) {
      reportClientError(event.reason, {
        screen: screen.name,
        action: "unhandledrejection",
      });
    }
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, [screen.name]);

  return <GameErrorBoundary screen={screen.name}>{renderScreen()}</GameErrorBoundary>;

  function renderScreen() {
    switch (screen.name) {
      case "title":
        return <TitleScreen onStart={() => setScreen({ name: "menu" })} />;

      case "menu":
        return (
          <MainMenuScreen
            onNewGame={() => setScreen({ name: "faction-name" })}
            onContinue={() => setScreen({ name: "load-list", slots: storage ? listSaveSlots(storage) : [] })}
            onSettings={() => setScreen({ name: "settings" })}
            onGoToTitle={() => setScreen({ name: "title" })}
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

      case "settings":
        return (
          <SettingsScreen
            onBack={() => setScreen({ name: "menu" })}
            autoBackupEnabled={autoBackupEnabled}
            onToggleAutoBackup={(enabled) => {
              setAutoBackupEnabled(enabled);
              storage?.setItem(AUTO_BACKUP_KEY, enabled ? "true" : "false");
            }}
            accountStatus={accountStatus}
            onLinkAccount={async (email, password) => {
              const result = await linkAccountWithEmail(email, password);
              if (result.ok) {
                setAccountStatus(await getAccountStatus());
                enableAutoBackup();
              }
              return result;
            }}
            onSignIn={async (email, password) => {
              const result = await signInWithEmail(email, password);
              if (result.ok) {
                setAccountStatus(await getAccountStatus());
                enableAutoBackup();
              }
              return result;
            }}
            onSignOut={async () => {
              const result = await signOutAccount();
              setAccountStatus(await getAccountStatus());
              return result;
            }}
            slots={storage ? listSaveSlots(storage) : []}
            onBackupSlot={async (slotId) => {
              if (!storage) return { ok: false, error: "저장 데이터를 찾을 수 없습니다." };
              const result = readSaveGame(storage, slotId);
              if (!result.ok) return { ok: false, error: "저장 데이터를 찾을 수 없습니다." };
              return backupSaveSlot(slotId, result.save);
            }}
            cloudBackups={cloudBackups}
            onRestoreBackup={async (slotId) => {
              const result = await restoreCloudBackup(slotId);
              if (result.ok && storage) writeSaveGame(storage, slotId, result.save);
              return result;
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
              onCompleteWorld={() => {
                const updated = completeActiveWorld(screen.save, new Date().toISOString());
                updateSave(updated);
                maybeAutoBackup(slotId, { ...updated, updatedAt: new Date().toISOString() });
              }}
              onEndTurn={() => updateSave(endTurn(screen.save, new Date().toISOString()))}
              onFoundCity={(heroId, position) => {
                const cityNumber = Object.keys(screen.save.cities).length + 1;
                try {
                  updateSave(foundCity(screen.save, heroId, position, `주둔지 ${cityNumber}`, new Date().toISOString()));
                } catch (error) {
                  reportClientError(error, { screen: screen.name, action: "onFoundCity" });
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
                  reportClientError(error, { screen: screen.name, action: "onCaptureCity" });
                  window.alert(error instanceof Error ? error.message : "도시를 점령할 수 없습니다.");
                }
              }}
              onSurrenderFaction={(factionId) => {
                try {
                  updateSave(surrenderRivalFaction(screen.save, factionId, new Date().toISOString()));
                } catch (error) {
                  reportClientError(error, { screen: screen.name, action: "onSurrenderFaction" });
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
            onSettings={() => setScreen({ name: "settings" })}
          />
        );
      }
    }
  }
}
