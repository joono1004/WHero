import { useState } from "react";
import {
  HERO_LOD_SAMPLES,
  WEI_YAN_TEST_HERO,
} from "@/lib/world/prototype/test-hero";
import { UNIT_VISUAL_SAMPLES } from "@/lib/world/prototype/test-unit";

export function TestHeroPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHeroId, setSelectedHeroId] = useState("wei-yan");
  const selectedHero =
    HERO_LOD_SAMPLES.find((hero) => hero.id === selectedHeroId) ??
    HERO_LOD_SAMPLES[2];

  return (
    <aside className={`test-hero-panel ${isOpen ? "is-open" : ""}`}>
      <button
        type="button"
        className="test-hero-summary"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <img src={selectedHero.image.portrait} alt="" />
        <span>
          <small>병과 표현 비교</small>
          <strong>{selectedHero.name} · {selectedHero.unitClass}</strong>
        </span>
      </button>
      <div className="test-hero-detail">
        <div className="hero-roster">
          {HERO_LOD_SAMPLES.map((hero) => (
            <button
              type="button"
              key={hero.id}
              className={selectedHero.id === hero.id ? "is-selected" : ""}
              style={{ "--hero-accent": hero.accent } as React.CSSProperties}
              onClick={() => setSelectedHeroId(hero.id)}
            >
              <img src={hero.image.badge} alt="" />
              <span>{hero.name}<small>{hero.unitClass}</small></span>
            </button>
          ))}
        </div>
        <div className="hero-detail-heading">
          <img src={selectedHero.image.portrait} alt={`${selectedHero.name} 초상화`} />
          <span>
          <small>{selectedHero.grade} · {selectedHero.unitClass} 대표 실루엣</small>
            <strong>{selectedHero.name}</strong>
            <em>{selectedHero.title}</em>
          </span>
        </div>
        <div className="hero-test-rule">
          축소: 얼굴 배지 · 확대: 전신/기마 말
          <br />
          위치 판정과 원형 받침은 항상 Hex 1칸에 고정됩니다.
        </div>
        <div className="unit-visual-guide">
          <strong>부대·영웅 표현 규칙</strong>
          <div>
            {UNIT_VISUAL_SAMPLES.map((unit) => (
              <span key={unit.id}>
                <i style={{ backgroundColor: unit.accent }} />
                {unit.name}
              </span>
            ))}
          </div>
          <p>
            가까이에서는 고전 전략 게임풍 대표 병사가 보이고, 멀리서는 병과
            문양으로 바뀝니다. 병사는 영웅과 독립된 부대이며, 초상 배지는
            영웅에게만 적용됩니다.
          </p>
        </div>
        {selectedHero.id === "wei-yan" && (
          <>
            <div className="hero-stat-grid">
              <span>통솔 <b>{WEI_YAN_TEST_HERO.attributes.leadership}</b></span>
              <span>무력 <b>{WEI_YAN_TEST_HERO.attributes.force}</b></span>
              <span>지력 <b>{WEI_YAN_TEST_HERO.attributes.intelligence}</b></span>
              <span>체력 <b>{WEI_YAN_TEST_HERO.attributes.vitality}</b></span>
              <span>매력 <b>{WEI_YAN_TEST_HERO.attributes.charisma}</b></span>
              <span>훈련 <b>{WEI_YAN_TEST_HERO.domesticSpecialty.grade}</b></span>
            </div>
            <div className="hero-test-rule">
              탐험 준비 · 이동력 <b>4</b> · 시야 <b>2</b>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
