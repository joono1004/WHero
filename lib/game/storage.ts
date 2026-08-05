import { parseSaveGame } from "./save.ts";
import type { SaveGame } from "./save.ts";

// Structurally matches window.localStorage, so the browser's real
// localStorage can be passed in as-is. Tests pass an in-memory fake instead
// (see storage.test.ts) - this is what keeps save/load testable without a
// browser, per AGENTS.md.
export type KeyValueStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
};

// A simple in-memory KeyValueStorage, for tests and as a reference
// implementation of the interface above.
export function createInMemoryStorage(): KeyValueStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    key: (index) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };
}

const SAVE_KEY_PREFIX = "whero:save:";

function saveKey(slotId: string): string {
  return `${SAVE_KEY_PREFIX}${slotId}`;
}

export function writeSaveGame(storage: KeyValueStorage, slotId: string, save: SaveGame): void {
  storage.setItem(saveKey(slotId), JSON.stringify(save));
}

export type ReadSaveGameResult =
  | { ok: true; save: SaveGame }
  | { ok: false; reason: "not-found" }
  | { ok: false; reason: "invalid"; errors: string[] };

export function readSaveGame(storage: KeyValueStorage, slotId: string): ReadSaveGameResult {
  const raw = storage.getItem(saveKey(slotId));
  if (raw === null) return { ok: false, reason: "not-found" };
  const result = parseSaveGame(raw);
  if (!result.ok) return { ok: false, reason: "invalid", errors: result.errors };
  return { ok: true, save: result.save };
}

export function deleteSaveGame(storage: KeyValueStorage, slotId: string): void {
  storage.removeItem(saveKey(slotId));
}

export type SaveSlotSummary = {
  slotId: string;
  factionName: string;
  worldIndex: number;
  // null while the save is sitting in the lobby (no active world) - see
  // save.ts's SaveGame.world doc comment.
  turn: number | null;
  updatedAt: string;
};

// Lists every readable save slot, newest-updated first. A slot that fails to
// parse (corrupted, hand-edited, from an incompatible version) is silently
// skipped rather than crashing the load-game screen - the player can still
// see and pick their other saves.
export function listSaveSlots(storage: KeyValueStorage): SaveSlotSummary[] {
  const summaries: SaveSlotSummary[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || !key.startsWith(SAVE_KEY_PREFIX)) continue;
    const slotId = key.slice(SAVE_KEY_PREFIX.length);
    const result = readSaveGame(storage, slotId);
    if (!result.ok) continue;
    const { world, nextMapCandidates } = result.save;
    summaries.push({
      slotId,
      factionName: result.save.factionName,
      worldIndex: world ? world.worldIndex : (nextMapCandidates[0]?.worldIndex ?? 1),
      turn: world ? world.turn : null,
      updatedAt: result.save.updatedAt,
    });
  }
  return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
