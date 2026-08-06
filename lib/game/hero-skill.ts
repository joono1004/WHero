// 스킬 (2026-08-xx direction, sibling to hero-trait.ts's 특기): an active
// combat ability a hero uses on the map during a fight, as opposed to a
// trait's always-on passive. No grade, fixed effect, up to MAX_HERO_SKILLS
// per hero. Like hero-trait.ts, this is currently just the catalog +
// descriptive effect text (data/display only) - not hooked into combat.ts
// yet. First batch, not the full roster - expect more entries.
export const HERO_SKILL_CATALOG = {
  charge: { name: "돌격", effect: "공격 2배, 방어 1.5배 감소" },
  ironwall: { name: "철벽", effect: "방어 2배" },
  barrage: { name: "난사", effect: "주변 적 병사 모두 공격" },
} as const satisfies Record<string, { name: string; effect: string }>;

export type HeroSkillId = keyof typeof HERO_SKILL_CATALOG;

export const MAX_HERO_SKILLS = 2;
