import { heroOverallGrade } from "./hero-definition.ts";
import type { HeroDefinition } from "./hero-definition.ts";
import type { CoreGrade } from "./grade.ts";
import type { ItemId } from "./ids.ts";

// 영웅 조각은 영웅 개인이 아닌 등급별 공용 재료다. 중복 영웅을 나중에
// 능력치 승급 재료로 바꾸기 위해, 세력 공용 가방(itemInventory)에 같은
// 아이템 ID를 여러 번 넣어 수량을 표현한다.
export const HERO_FRAGMENT_ITEM_ID: Record<CoreGrade, ItemId> = {
  SS: "hero-fragment-ss",
  S: "hero-fragment-s",
  A: "hero-fragment-a",
  B: "hero-fragment-b",
  C: "hero-fragment-c",
  D: "hero-fragment-d",
};

export const HERO_FRAGMENT_LABEL: Record<CoreGrade, string> = {
  SS: "SS등급 영웅 조각",
  S: "S등급 영웅 조각",
  A: "A등급 영웅 조각",
  B: "B등급 영웅 조각",
  C: "C등급 영웅 조각",
  D: "D등급 영웅 조각",
};

export function heroFragmentGrade(itemId: ItemId): CoreGrade | null {
  return (Object.entries(HERO_FRAGMENT_ITEM_ID) as [CoreGrade, ItemId][])
    .find(([, fragmentId]) => fragmentId === itemId)?.[0] ?? null;
}

export type RecruitmentResult = {
  recruitedHeroes: HeroDefinition[];
  fragmentGrades: CoreGrade[];
  resultKinds: ("hero" | "fragment")[];
};

// 결과 목록 안에서 같은 영웅이 두 번 나온 경우에도 첫 장만 새 영웅으로
// 영입되고, 뒤의 카드는 즉시 해당 등급의 영웅 조각으로 바뀐다.
export function resolveRecruitmentDraws(
  drawnHeroes: HeroDefinition[],
  ownedHeroIds: Iterable<string>,
): RecruitmentResult {
  const owned = new Set(ownedHeroIds);
  const recruitedHeroes: HeroDefinition[] = [];
  const fragmentGrades: CoreGrade[] = [];
  const resultKinds: ("hero" | "fragment")[] = [];

  for (const hero of drawnHeroes) {
    if (owned.has(hero.id)) {
      fragmentGrades.push(heroOverallGrade(hero.attributes));
      resultKinds.push("fragment");
      continue;
    }
    owned.add(hero.id);
    recruitedHeroes.push(hero);
    resultKinds.push("hero");
  }

  return { recruitedHeroes, fragmentGrades, resultKinds };
}
