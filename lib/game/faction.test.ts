import assert from "node:assert/strict";
import test from "node:test";
import { createFaction, isFactionEliminated } from "./faction.ts";

test("createFaction starts with no capital and not eliminated", () => {
  const faction = createFaction({ id: "faction-1", name: "테스트세력", isPlayerControlled: true });
  assert.equal(faction.capitalCityId, null);
  assert.equal(faction.eliminationReason, null);
  assert.equal(isFactionEliminated(faction), false);
});

test("isFactionEliminated is true once eliminationReason is set, regardless of reason", () => {
  const faction = createFaction({ id: "faction-1", name: "테스트세력", isPlayerControlled: false });
  assert.equal(isFactionEliminated({ ...faction, eliminationReason: "captured" }), true);
  assert.equal(isFactionEliminated({ ...faction, eliminationReason: "surrendered" }), true);
});
