// 특기 (2026-08-xx direction): a hero's named passive abilities. Unlike
// attributes/domesticSpecialties, these have no grade - a hero either has
// one or doesn't, and its effect is a fixed value. A hero can have up to
// MAX_HERO_TRAITS. This replaces two prior systems at once: 내정
// (domesticSpecialties' city-yield bonuses) and the old empty TraitKind
// placeholder ("charge"/"magic", never wired to anything). This module is
// currently just the catalog + descriptive effect text (data/display
// only) - the numbers described here aren't hooked into combat.ts,
// movement.ts, or hero-assignment.ts's city-yield math yet (still
// domesticSpecialties-driven internally for now); that's separate
// follow-up work. The list below is a first batch, not the full roster -
// expect more entries.
export const HERO_TRAIT_CATALOG = {
  talent: { name: "인재", effect: "병사 생산 2배" },
  logging: { name: "벌목", effect: "목재 생산 2배" },
  farming: { name: "농사", effect: "식량 생산 2배" },
  trade: { name: "상인", effect: "금 생산 2배" },
  charge: { name: "돌격", effect: "공격 2배, 방어 1.5배 감소" },
  peerless: { name: "무쌍", effect: "반격 무시" },
  "dual-wield": { name: "쌍수", effect: "공격 1.5배" },
  ironwall: { name: "철벽", effect: "방어 2배" },
  navy: { name: "수군", effect: "바다·강·호수 이동을 평지 수준으로" },
  mountaineer: { name: "산악", effect: "산 이동 가능, 언덕·산 이동을 평지 수준으로" },
  longshot: { name: "원사", effect: "공격거리 +4" },
} as const satisfies Record<string, { name: string; effect: string }>;

export type HeroTraitId = keyof typeof HERO_TRAIT_CATALOG;

export const MAX_HERO_TRAITS = 5;
