import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("renders the actual game at the root route", async () => {
  const htmlUrl = new URL("../.next/server/app/index.html", import.meta.url);
  const html = await readFile(htmlUrl, "utf8");

  assert.match(html, /<title>World in Hero/);
  assert.match(html, /세계 영웅 정복/);
  assert.match(html, /시작하기/);
  assert.doesNotMatch(html, /codex-preview/);
});

test("renders Codex's world-generation prototype at /world-lab", async () => {
  const htmlUrl = new URL("../.next/server/app/world-lab.html", import.meta.url);
  const html = await readFile(htmlUrl, "utf8");

  assert.match(html, /<title>World in Hero/);
  assert.match(html, /세계 생성 실험실/);
  assert.doesNotMatch(html, /codex-preview/);
});
