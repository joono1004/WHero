"use client";

import { useState } from "react";
import { STARTING_HEROES } from "../../../lib/game/starting-heroes.ts";
import { Button } from "../Button.tsx";
import { HeroCard } from "../HeroCard.tsx";
import { ScreenShell } from "../ScreenShell.tsx";

export function HeroSelectScreen({
  onConfirm,
  onBack,
}: {
  onConfirm: (heroId: string) => void;
  onBack: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <ScreenShell
      header={<h2 className="text-lg font-bold text-[#f3dfaa]">영웅을 선택하세요</h2>}
      footer={
        <div className="flex justify-center gap-3">
          <Button variant="secondary" size="sm" onClick={onBack}>
            뒤로
          </Button>
          <Button size="sm" onClick={() => selectedId && onConfirm(selectedId)} disabled={!selectedId}>
            이 영웅으로 시작
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-2 pb-1">
        {STARTING_HEROES.map((hero) => (
          <HeroCard
            key={hero.id}
            hero={hero}
            selected={hero.id === selectedId}
            onSelect={() => setSelectedId(hero.id)}
          />
        ))}
      </div>
    </ScreenShell>
  );
}
