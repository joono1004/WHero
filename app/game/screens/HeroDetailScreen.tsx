import { heroArchetype, heroOverallGrade } from "../../../lib/game/hero-definition.ts";
import type { HeroDefinition } from "../../../lib/game/hero-definition.ts";
import { pipsRequiredForNextGrade } from "../../../lib/game/grade.ts";
import { HERO_SKILL_CATALOG } from "../../../lib/game/hero-skill.ts";
import { HERO_TRAIT_CATALOG } from "../../../lib/game/hero-trait.ts";
import type { AttributeKey, HeroState } from "../../../lib/game/hero.ts";
import { MAX_ITEMS_PER_HERO } from "../../../lib/game/hero.ts";
import { Button } from "../Button.tsx";
import { ARCHETYPE_LABEL, UNIT_TYPE_LABEL } from "../heroLabels.ts";
import { ScreenShell } from "../ScreenShell.tsx";

const ATTRIBUTE_LABEL: Record<AttributeKey, string> = {
  leadership: "통솔",
  force: "무력",
  intelligence: "지력",
  vitality: "체력",
  charisma: "매력",
};

// Explicit display order (통솔/무력/지력/체력/매력, 2026-07-28 사용자 확정) -
// not read from Object.keys(definition.attributes), since that follows each
// hero literal's own field order rather than a guaranteed display order.
const ATTRIBUTE_ORDER: AttributeKey[] = ["leadership", "force", "intelligence", "vitality", "charisma"];

export function HeroDetailScreen({
  hero,
  definition,
  governorLabel,
  onBack,
  onToggleDeploymentPriority,
  onUnequipItem,
}: {
  hero: HeroState;
  definition: HeroDefinition;
  governorLabel: string | null;
  onBack: () => void;
  onToggleDeploymentPriority: () => void;
  onUnequipItem: (itemId: string) => void;
}) {
  const grade = heroOverallGrade(definition.attributes);
  const archetype = heroArchetype(definition.attributes);

  return (
    <ScreenShell
      header={
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#f3dfaa]">{definition.name}</h2>
          <span className="text-[10px] text-[#8fa6a8]">
            {grade}급 · {ARCHETYPE_LABEL[archetype]} · Lv.{hero.level}
            {governorLabel ? ` · ${governorLabel}` : ""}
          </span>
        </div>
      }
      footer={
        <div className="flex items-center justify-between">
          <Button size="sm" variant="secondary" onClick={onBack}>
            뒤로
          </Button>
          <Button
            size="sm"
            variant={hero.deploymentPriority ? "primary" : "secondary"}
            onClick={onToggleDeploymentPriority}
          >
            {hero.deploymentPriority ? "★ 출전 우선" : "☆ 출전 우선 아님"}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-2 pb-1 text-[11px]">
        <section className="rounded-md border border-[#43606a] bg-[#17343e] p-2">
          <h3 className="mb-1 text-[10px] font-bold text-[#8fa6a8]">능력치</h3>
          <div className="flex flex-col gap-1">
            {ATTRIBUTE_ORDER.map((key) => {
              const attrGrade = definition.attributes[key];
              const required = pipsRequiredForNextGrade(attrGrade);
              const filled = hero.attributeProgress[key];
              const ratio = required ? Math.min(1, filled / required) : 1;
              return (
                <div key={key}>
                  <div className="flex justify-between">
                    <span className="text-[#c0cbc7]">{ATTRIBUTE_LABEL[key]}</span>
                    <span className="font-bold text-[#e3ce94]">{attrGrade}</span>
                  </div>
                  <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-[#0b2028]">
                    <div
                      className="h-full rounded-full bg-[#d7b765]"
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-[9px] text-[#8fa6a8]">
                    {required ? `${filled}/${required}칸` : "최고 등급"}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-[#8fa6a8]">
            경험치 {hero.experience} · Lv.{hero.level}
          </p>
        </section>

        <div className="flex flex-col gap-2">
          <section className="rounded-md border border-[#43606a] bg-[#17343e] p-2">
            <h3 className="mb-1 text-[10px] font-bold text-[#8fa6a8]">병과 · 특기</h3>
            <p className="text-[#c0cbc7]">병과: {UNIT_TYPE_LABEL[definition.unitType]}</p>
            {definition.traits.length > 0 ? (
              <ul className="mt-1 flex flex-col gap-0.5">
                {definition.traits.map((traitId) => {
                  const trait = HERO_TRAIT_CATALOG[traitId];
                  return (
                    <li key={traitId} className="text-[#c0cbc7]">
                      <span className="font-bold text-[#e3ce94]">{trait.name}</span> · {trait.effect}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-1 text-[#c0cbc7]">특기: 없음</p>
            )}
          </section>

          <section className="rounded-md border border-[#43606a] bg-[#17343e] p-2">
            <h3 className="mb-1 text-[10px] font-bold text-[#8fa6a8]">스킬</h3>
            {definition.skills.length > 0 ? (
              <ul className="flex flex-col gap-0.5">
                {definition.skills.map((skillId) => {
                  const skill = HERO_SKILL_CATALOG[skillId];
                  return (
                    <li key={skillId} className="text-[#c0cbc7]">
                      <span className="font-bold text-[#e3ce94]">{skill.name}</span> · {skill.summary}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-[#c0cbc7]">없음</p>
            )}
          </section>

          <section className="rounded-md border border-[#43606a] bg-[#17343e] p-2">
            <h3 className="mb-1 text-[10px] font-bold text-[#8fa6a8]">
              아이템 ({hero.items.length}/{MAX_ITEMS_PER_HERO})
            </h3>
            <div className="flex flex-col gap-1">
              {Array.from({ length: MAX_ITEMS_PER_HERO }).map((_, index) => {
                const item = hero.items[index];
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded border border-dashed border-[#43606a] px-2 py-1"
                  >
                    <span className="text-[#c0cbc7]">{item ? item.name : "빈 슬롯"}</span>
                    {item && (
                      <Button size="sm" variant="danger" onClick={() => onUnequipItem(item.id)}>
                        해제
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-1 text-[9px] text-[#8fa6a8]">장착 가능한 아이템이 아직 없습니다.</p>
          </section>
        </div>
      </div>
    </ScreenShell>
  );
}
