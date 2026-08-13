"use client";

import { useEffect, useState } from "react";
import { DeviceFrame } from "./DeviceFrame.tsx";
import { GameErrorBoundary } from "./GameErrorBoundary.tsx";
import { reportClientError } from "./reportError.ts";
import {
  backupSaveSlot,
  deleteAllCloudBackups,
  ensureGuestSession,
  getAccountStatus,
  linkAccountWithEmail,
  listCloudBackups,
  registerAccountWithEmail,
  restoreCloudBackup,
  signInWithEmail,
  signOutAccount,
} from "./account.ts";
import type { AccountStatus } from "./account.ts";
import { createNewSaveGame } from "../../lib/game/new-game.ts";
import type { SaveGame } from "../../lib/game/save.ts";
import { deleteSaveGame, listSaveSlots, readSaveGame, writeSaveGame } from "../../lib/game/storage.ts";
import type { KeyValueStorage } from "../../lib/game/storage.ts";
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
import { BattleBriefingScreen } from "./screens/BattleBriefingScreen.tsx";
import { SettingsScreen } from "./screens/SettingsScreen.tsx";
import { TitleScreen } from "./screens/TitleScreen.tsx";

// The game only ever tracks one faction at a time (see MainMenuScreen's
// 새 게임/이어하기 toggle) - there's no save-slot picker, so "settings"
// just remembers whichever screen opened it (menu or the in-game lobby) to
// return to on 뒤로가기, instead of always landing back on the main menu.
type Screen =
  | { name: "title" }
  | { name: "menu" }
  | { name: "settings"; returnTo: Screen }
  | { name: "faction-name" }
  | { name: "hero-select"; factionName: string }
  | { name: "battle-briefing"; slotId: string; save: SaveGame; candidateIndex: number; heroId: string; countryId: number }
  | { name: "main"; slotId: string; save: SaveGame };

const AUTO_BACKUP_KEY = "whero:auto-backup";

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
  // Every player gets an invisible anonymous session so a save has a stable
  // cloud identity from the start; nothing is uploaded until the player
  // explicitly links a real account in Settings (see account.ts).
  useEffect(() => {
    if (!storage) return;
    void ensureGuestSession().then(() => getAccountStatus()).then(setAccountStatus);
  }, [storage]);

  // Refreshes account state whenever Settings is opened, so it reflects a
  // link/sign-in that may have happened moments ago.
  useEffect(() => {
    if (screen.name !== "settings") return;
    void getAccountStatus().then(setAccountStatus);
  }, [screen.name]);

  function maybeAutoBackup(slotId: string, save: SaveGame) {
    if (!autoBackupEnabled || accountStatus?.linked !== true) return;
    void backupSaveSlot(slotId, save, "auto").then((result) => {
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

  function startNewGame(factionName: string, heroId: string) {
    if (!storage) return;
    // Campaign country progress belongs to the current save.  It is stored
    // separately only for the world-map presentation, so it must be cleared
    // before creating a new save as well.
    const save = createNewSaveGame({
      factionName,
      heroId,
      seed: Math.floor(Math.random() * 99999999),
      now: new Date().toISOString(),
    });
    const slotId = `slot-${Date.now()}`;
    writeSaveGame(storage, slotId, save);
    setScreen({ name: "main", slotId, save });
  }

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

  return (
    <DeviceFrame>
      <GameErrorBoundary screen={screen.name}>{renderScreen()}</GameErrorBoundary>
    </DeviceFrame>
  );

  function renderScreen() {
    switch (screen.name) {
      case "title":
        return <TitleScreen onStart={() => setScreen({ name: "menu" })} />;

      case "menu": {
        const [existingSlot] = storage ? listSaveSlots(storage) : [];
        const continueFromLocalSave = () => {
          if (!storage || !existingSlot) return false;
          const result = readSaveGame(storage, existingSlot.slotId);
          if (!result.ok) return false;
          setScreen({ name: "main", slotId: existingSlot.slotId, save: result.save });
          return true;
        };
        return (
          <MainMenuScreen
            onContinue={() => {
              if (!storage || !existingSlot) return;
              const result = readSaveGame(storage, existingSlot.slotId);
              if (result.ok) {
                setScreen({ name: "main", slotId: existingSlot.slotId, save: result.save });
              } else {
                window.alert("이 저장 데이터를 불러올 수 없습니다 (손상되었거나 지원하지 않는 버전).");
              }
            }}
            onGoToTitle={() => setScreen({ name: "title" })}
            accountStatus={accountStatus}
            onSignIn={async (email, password) => {
              const result = await signInWithEmail(email, password);
              if (result.ok) {
                setAccountStatus(await getAccountStatus());
                enableAutoBackup();
                if (!continueFromLocalSave()) setScreen({ name: "faction-name" });
              }
              return result;
            }}
            onRegister={async (email, password) => {
              const result = await registerAccountWithEmail(email, password);
              if (result.ok) {
                setAccountStatus(await getAccountStatus());
                enableAutoBackup();
                setScreen({ name: "faction-name" });
              }
              return result;
            }}
          />
        );
      }

      case "settings":
        return (
          <SettingsScreen
            onBack={() => setScreen(screen.returnTo)}
            backLabel={screen.returnTo.name === "menu" ? "메인 메뉴로" : "이전 화면으로"}
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
            hasLocalSave={storage ? listSaveSlots(storage).length > 0 : false}
            onBackupNow={async () => {
              if (!storage) return { ok: false, error: "저장 데이터를 찾을 수 없습니다." };
              // "지금 백업" backs up whichever local save was played most
              // recently - the player thinks of this as "my save", not a
              // particular slot (see account.ts's backup-type comment).
              const [latest] = listSaveSlots(storage);
              if (!latest) return { ok: false, error: "저장된 게임이 없습니다." };
              const result = readSaveGame(storage, latest.slotId);
              if (!result.ok) return { ok: false, error: "저장 데이터를 찾을 수 없습니다." };
              return backupSaveSlot(latest.slotId, result.save, "manual");
            }}
            onFetchCloudBackups={() => listCloudBackups()}
            onRestoreBackup={async (backupType) => {
              const result = await restoreCloudBackup(backupType);
              if (result.ok && storage) writeSaveGame(storage, result.slotId, result.save);
              return result;
            }}
            onDeleteAccountData={async () => {
              const result = await deleteAllCloudBackups();
              if (result.ok && storage) {
                // "계정 데이터 삭제" resets everything, not just the cloud
                // copies - otherwise the player's local save survives and
                // the confirmation dialog's "초기화 됩니다" is a lie.
                for (const slot of listSaveSlots(storage)) {
                  deleteSaveGame(storage, slot.slotId);
                }
              }
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
            onConfirm={(heroId) => startNewGame(screen.factionName, heroId)}
          />
        );

      case "battle-briefing": {
        const candidate = screen.save.nextMapCandidates[screen.candidateIndex];
        if (!candidate) {
          setScreen({ name: "main", slotId: screen.slotId, save: screen.save });
          return null;
        }
        return <BattleBriefingScreen candidate={candidate} heroes={screen.save.heroes} initialHeroId={screen.heroId} onBack={() => setScreen({ name: "main", slotId: screen.slotId, save: screen.save })} onStart={(heroId) => {
          const entered = enterMapCandidate(screen.save, screen.candidateIndex, [heroId], new Date().toISOString());
          const updated = {
            ...entered,
            campaign: { ...entered.campaign, activeCountryId: screen.countryId },
          };
          if (storage) writeSaveGame(storage, screen.slotId, { ...updated, updatedAt: new Date().toISOString() });
          setScreen({ name: "main", slotId: screen.slotId, save: updated });
        }} />;
      }

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
                const completed = completeActiveWorld(screen.save, new Date().toISOString());
                const activeCountry = screen.save.campaign.activeCountryId ?? 1;
                const updated = {
                  ...completed,
                  campaign: {
                    conqueredCountryIds: [...new Set([...completed.campaign.conqueredCountryIds, activeCountry])],
                    activeCountryId: null,
                  },
                };
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
            onEnterCandidate={(candidateIndex, enlistedHeroIds, countryId = 1) => setScreen({ name: "battle-briefing", slotId, save: screen.save, candidateIndex, heroId: enlistedHeroIds[0], countryId })}
            onSettings={() => setScreen({ name: "settings", returnTo: screen })}
          />
        );
      }
    }
  }
}
