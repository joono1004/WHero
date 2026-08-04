import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("renders the World in Hero prototype", async () => {
  const htmlUrl = new URL("../.next/server/app/index.html", import.meta.url);
  const html = await readFile(htmlUrl, "utf8");

  assert.match(html, /<title>World in Hero/);
  assert.match(html, /세계 생성 실험실/);
  assert.match(html, /World in Hero/);
  assert.doesNotMatch(html, /codex-preview/);
});
