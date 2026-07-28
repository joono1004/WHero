import { useState } from "react";
import { WEI_YAN_TEST_HERO } from "@/lib/world/prototype/test-hero";

export function TestHeroPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const hero = WEI_YAN_TEST_HERO;

  return (
    <aside className={`test-hero-panel ${isOpen ? "is-open" : ""}`}>
      <button
        type="button"
        className="test-hero-summary"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <img src={hero.image.portrait} alt="" />
        <span>
          <small>테스트 영웅</small>
          <strong>{hero.name}</strong>
        </span>
      </button>
      <div className="test-hero-detail">
        <div className="hero-detail-heading">
          <img src={hero.image.portrait} alt={`${hero.name} 초상화`} />
          <span>
            <small>장군형 · 시작 영웅</small>
            <strong>{hero.name}</strong>
            <em>{hero.title}</em>
          </span>
        </div>
        <p>{hero.description}</p>
        <div className="hero-stat-grid">
          <span>통솔 <b>{hero.attributes.leadership}</b></span>
          <span>무력 <b>{hero.attributes.force}</b></span>
          <span>지력 <b>{hero.attributes.intelligence}</b></span>
          <span>체력 <b>{hero.attributes.vitality}</b></span>
          <span>매력 <b>{hero.attributes.charisma}</b></span>
          <span>{hero.domesticSpecialty.name} <b>{hero.domesticSpecialty.grade}</b></span>
        </div>
        <div className="hero-test-rule">
          다음 탐험 단계 준비 · 이동력{" "}
          <b>{hero.prototypeExploration.movement}</b> · 시야{" "}
          <b>{hero.prototypeExploration.sight}</b>
        </div>
      </div>
    </aside>
  );
}
