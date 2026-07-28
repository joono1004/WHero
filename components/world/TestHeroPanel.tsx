import { useState } from "react";
import {
  HERO_LOD_SAMPLES,
  WEI_YAN_TEST_HERO,
} from "@/lib/world/prototype/test-hero";

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
            <small>{selectedHero.unitClass} 대표 실루엣</small>
            <strong>{selectedHero.name}</strong>
            <em>{selectedHero.title}</em>
          </span>
        </div>
        <div className="hero-test-rule">
          축소: 얼굴 배지 · 확대: 전신/기마 말
          <br />
          위치 판정과 원형 받침은 항상 Hex 1칸에 고정됩니다.
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
