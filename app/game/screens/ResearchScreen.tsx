import type { FactionResources } from "../../../lib/game/faction.ts";
import { canAffordResearch, researchUpgradeCost } from "../../../lib/game/research.ts";
import type { ResearchCategory, ResearchLevels } from "../../../lib/game/research.ts";
import { Button } from "../Button.tsx";
import { ECONOMY_RESEARCH_CATEGORIES, RESEARCH_LABEL, TROOP_RESEARCH_CATEGORIES } from "../researchLabels.ts";
import { ScreenShell } from "../ScreenShell.tsx";

export function ResearchScreen({
  research,
  resources,
  onUpgrade,
  onBack,
}: {
  research: ResearchLevels;
  resources: FactionResources;
  onUpgrade: (category: ResearchCategory) => void;
  onBack: () => void;
}) {
  return (
    <ScreenShell
      header={
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#f3dfaa]">연구</h2>
          <span className="text-[10px] text-[#8fa6a8]">
            금 {resources.gold} · 유산 {resources.researchResource}
          </span>
        </div>
      }
      footer={
        <div className="flex justify-center">
          <Button variant="secondary" size="sm" onClick={onBack}>
            뒤로
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-2 pb-1">
        <ResearchGroup title="내정" categories={ECONOMY_RESEARCH_CATEGORIES} research={research} resources={resources} onUpgrade={onUpgrade} />
        <ResearchGroup title="병과" categories={TROOP_RESEARCH_CATEGORIES} research={research} resources={resources} onUpgrade={onUpgrade} />
      </div>
    </ScreenShell>
  );
}

function ResearchGroup({
  title,
  categories,
  research,
  resources,
  onUpgrade,
}: {
  title: string;
  categories: ResearchCategory[];
  research: ResearchLevels;
  resources: FactionResources;
  onUpgrade: (category: ResearchCategory) => void;
}) {
  return (
    <section className="rounded-md border border-[#43606a] bg-[#17343e] p-2">
      <h3 className="mb-1 text-[10px] font-bold text-[#8fa6a8]">{title}</h3>
      <div className="flex flex-col gap-1.5">
        {categories.map((category) => {
          const level = research[category];
          const cost = researchUpgradeCost(level);
          const affordable = cost ? canAffordResearch(resources, cost) : false;
          return (
            <div key={category} className="flex items-center justify-between text-[11px]">
              <div>
                <p className="text-[#c0cbc7]">
                  {RESEARCH_LABEL[category]} <span className="font-bold text-[#e3ce94]">Lv.{level}</span>
                  {cost ? "" : ` (최대)`}
                </p>
                {cost && (
                  <p className="text-[9px] text-[#8fa6a8]">
                    다음: 금 {cost.gold} · 유산 {cost.researchResource}
                  </p>
                )}
              </div>
              <Button size="sm" disabled={!cost || !affordable} onClick={() => onUpgrade(category)}>
                연구
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
