// 스킬 (2026-08-xx direction, sibling to hero-trait.ts's 특기): an active
// combat ability a hero uses on the map during a fight, as opposed to a
// trait's always-on passive. No grade, fixed effect, up to MAX_HERO_SKILLS
// per hero. Like hero-trait.ts, this is currently just the catalog +
// descriptive text (data/display only) - not hooked into combat.ts yet.
// First batch, not the full roster - expect more entries.
//
// Each skill has two description fields (2026-08-06 방향, 스킬 팝업 UI에
// 맞춰 effect 한 줄에서 확장): `summary` is a short, numbers-first line
// ("공격력 20% 추가 데미지, 방어력 10% 감소" 식), `description` is the
// longer narrative/rules-text sentence a player reads for the full effect
// ("적군에게 입히는 공격력의 20%만큼 데미지를 추가로 입히고, 3턴동안
// 방어력을 10%만큼 감소시킨다" 식). 돌격의 수치(20%/10%/3턴)는 사용자가
// 직접 확정한 값 - 나머지(철벽/난사)는 아직 실제 수치가 없어서 기존
// effect 한 줄을 요약/설명으로 나눠 임시로 작성한 것(사용자 확인 대기,
// 수치가 정해지면 교체 예정).
export const HERO_SKILL_CATALOG = {
  charge: {
    name: "돌격",
    summary: "공격력 20% 추가 데미지, 방어력 10% 감소",
    description: "적군에게 입히는 공격력의 20%만큼 데미지를 추가로 입히고, 3턴동안 방어력을 10%만큼 감소시킨다.",
  },
  ironwall: {
    name: "철벽",
    summary: "방어력 100% 증가",
    description: "방어 태세를 갖춰 일정 시간 동안 자신의 방어력을 두 배로 끌어올린다.",
  },
  barrage: {
    name: "난사",
    summary: "주변 적 전체 공격",
    description: "화살을 사방으로 난사하여 주변에 있는 모든 적 병사에게 피해를 입힌다.",
  },
} as const satisfies Record<string, { name: string; summary: string; description: string }>;

export type HeroSkillId = keyof typeof HERO_SKILL_CATALOG;

export const MAX_HERO_SKILLS = 2;
