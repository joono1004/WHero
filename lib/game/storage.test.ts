import assert from "node:assert/strict";
import test from "node:test";
import {
  createInMemoryStorage,
  deleteSaveGame,
  listSaveSlots,
  readSaveGame,
  writeSaveGame,
} from "./storage.ts";
import type { SaveGame } from "./save.ts";
import { SAVE_SCHEMA_VERSION } from "./save.ts";
import { ZERO_FACTION_RESOURCES } from "./faction.ts";
import { ZERO_RESEARCH_LEVELS } from "./research.ts";
import { ZERO_TROOP_LEVELS } from "./unit-evolution.ts";

function makeSave(overrides: Partial<SaveGame> = {}): SaveGame {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    factionName: "Player",
    heroes: [],
    world: {
      id: "world-1",
      worldIndex: 1,
      generation: { seed: 1, mapType: "continent", mapTier: "medium", terrainVersion: "v1" },
      factionIds: ["faction-1"],
      playerFactionId: "faction-1",
      exploredHexes: [],
      turn: 1,
      conquered: false,
      heroDeploymentLimit: 5,
      enlistedHeroIds: [],
      troopLevelsSnapshot: ZERO_TROOP_LEVELS,
    },
    nextMapCandidates: [],
    clearedWorlds: {},
    factions: {
      "faction-1": {
        id: "faction-1",
        name: "Player",
        isPlayerControlled: true,
        level: 1,
        cityIds: [],
        unitIds: [],
        resources: ZERO_FACTION_RESOURCES,
        research: ZERO_RESEARCH_LEVELS,
        troopLevels: ZERO_TROOP_LEVELS,
        unlockedUnitTypes: [],
        activeEvolution: {},
        itemInventory: [],
        capitalCityId: null,
        eliminationReason: null,
      },
    },
    units: {},
    cities: {},
    createdAt: "2026-07-27T00:00:00.000Z",
    updatedAt: "2026-07-27T00:00:00.000Z",
    ...overrides,
  };
}

test("readSaveGame reports not-found for an empty slot", () => {
  const storage = createInMemoryStorage();
  const result = readSaveGame(storage, "slot-1");
  assert.deepEqual(result, { ok: false, reason: "not-found" });
});

test("writeSaveGame then readSaveGame round-trips the same save", () => {
  const storage = createInMemoryStorage();
  const save = makeSave({ factionName: "Northwind" });
  writeSaveGame(storage, "slot-1", save);
  const result = readSaveGame(storage, "slot-1");
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.save, save);
});

test("readSaveGame reports invalid for corrupted data instead of throwing", () => {
  const storage = createInMemoryStorage();
  storage.setItem("whero:save:slot-1", "{not json");
  const result = readSaveGame(storage, "slot-1");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "invalid");
});

test("deleteSaveGame removes a slot", () => {
  const storage = createInMemoryStorage();
  writeSaveGame(storage, "slot-1", makeSave());
  deleteSaveGame(storage, "slot-1");
  assert.deepEqual(readSaveGame(storage, "slot-1"), { ok: false, reason: "not-found" });
});

test("different slot ids don't collide", () => {
  const storage = createInMemoryStorage();
  writeSaveGame(storage, "slot-1", makeSave({ factionName: "A" }));
  writeSaveGame(storage, "slot-2", makeSave({ factionName: "B" }));
  const a = readSaveGame(storage, "slot-1");
  const b = readSaveGame(storage, "slot-2");
  assert.equal(a.ok && a.save.factionName, "A");
  assert.equal(b.ok && b.save.factionName, "B");
});

test("writeSaveGame overwrites an existing slot rather than appending", () => {
  const storage = createInMemoryStorage();
  writeSaveGame(storage, "slot-1", makeSave({ factionName: "First" }));
  writeSaveGame(storage, "slot-1", makeSave({ factionName: "Second" }));
  const result = readSaveGame(storage, "slot-1");
  assert.equal(result.ok && result.save.factionName, "Second");
});

test("listSaveSlots is empty when nothing has been saved", () => {
  const storage = createInMemoryStorage();
  assert.deepEqual(listSaveSlots(storage), []);
});

test("listSaveSlots lists every saved slot with a summary", () => {
  const storage = createInMemoryStorage();
  writeSaveGame(storage, "slot-1", makeSave({ factionName: "Northwind", updatedAt: "2026-07-20T00:00:00.000Z" }));
  writeSaveGame(storage, "slot-2", makeSave({ factionName: "Southgate", updatedAt: "2026-07-25T00:00:00.000Z" }));
  const slots = listSaveSlots(storage);
  assert.equal(slots.length, 2);
  assert.ok(slots.some((slot) => slot.slotId === "slot-1" && slot.factionName === "Northwind"));
  assert.ok(slots.some((slot) => slot.slotId === "slot-2" && slot.factionName === "Southgate"));
});

test("listSaveSlots sorts by most recently updated first", () => {
  const storage = createInMemoryStorage();
  writeSaveGame(storage, "old", makeSave({ updatedAt: "2026-07-01T00:00:00.000Z" }));
  writeSaveGame(storage, "new", makeSave({ updatedAt: "2026-07-27T00:00:00.000Z" }));
  const slots = listSaveSlots(storage);
  assert.deepEqual(slots.map((slot) => slot.slotId), ["new", "old"]);
});

test("listSaveSlots skips a corrupted slot instead of crashing the whole list", () => {
  const storage = createInMemoryStorage();
  writeSaveGame(storage, "good", makeSave({ factionName: "Fine" }));
  storage.setItem("whero:save:bad", "{not json");
  const slots = listSaveSlots(storage);
  assert.equal(slots.length, 1);
  assert.equal(slots[0].factionName, "Fine");
});

test("listSaveSlots ignores unrelated keys in the same storage", () => {
  const storage = createInMemoryStorage();
  storage.setItem("some-other-app:setting", "value");
  writeSaveGame(storage, "slot-1", makeSave());
  const slots = listSaveSlots(storage);
  assert.equal(slots.length, 1);
});
