"use client";

import { useState } from "react";
import { STARTING_HEROES } from "../../../lib/game/starting-heroes.ts";
import { Button } from "../Button.tsx";
import { HeroCard } from "../HeroCard.tsx";

export function HeroSelectScreen({
  onConfirm,
  onBack,
}: {
  onConfirm: (heroId: string) => void;
  onBack: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="hero-select-screen">
      <header className="hero-select-screen__header">
        <h2 className="text-lg font-bold text-[#f3dfaa]">영웅을 선택하세요</h2>
      </header>
      <div className="hero-select-screen__cards">
        {STARTING_HEROES.map((hero) => (
          <HeroCard
            key={hero.id}
            hero={hero}
            selected={hero.id === selectedId}
            onSelect={() => setSelectedId((currentId) => (currentId === hero.id ? null : hero.id))}
          />
        ))}
      </div>
      <footer className="hero-select-screen__footer">
        {selectedId ? (
          <Button className="hero-select-screen__button hero-select-screen__button--confirm" size="sm" onClick={() => onConfirm(selectedId)}>
            이 영웅으로 시작
          </Button>
        ) : (
          <Button className="hero-select-screen__button hero-select-screen__button--back" variant="secondary" size="sm" onClick={onBack}>
            뒤로
          </Button>
        )}
      </footer>
    </div>
  );
}
