"use client";

import type { Ref } from "react";

import type { TacticalSkill } from "@/lib/world/prototype/tactical-interaction";

export type TacticalAttackChoice = {
  id: "melee" | "ranged";
  label: string;
  damage: number;
};

export type TacticalPanelState = {
  actorName: string | null;
  actorKind: "hero" | "unit" | null;
  remainingMovement: number;
  movement: number;
  acted: boolean;
  message: string;
  skills: TacticalSkill[];
  attackChoices: TacticalAttackChoice[];
  skillMenuOpen: boolean;
};

export type TacticalPanelCommand =
  | { type: "wait" }
  | { type: "toggle-skills" }
  | { type: "use-skill"; skillId: string }
  | { type: "attack"; modeId: "melee" | "ranged" }
  | { type: "reset-turn" }
  | { type: "cancel" };

export function TacticalActionPanel({
  state,
  onCommand,
  panelRef,
}: {
  state: TacticalPanelState;
  onCommand: (command: TacticalPanelCommand) => void;
  panelRef?: Ref<HTMLElement>;
}) {
  return (
    <aside
      ref={panelRef}
      className={`tactical-action-panel ${state.actorName ? "is-active" : ""}`}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="tactical-status">
        <span>{state.actorName ?? "이동 테스트"}</span>
        <strong>{state.message}</strong>
        {state.actorName && (
          <small>
            이동력 {state.remainingMovement}/{state.movement}
            {state.acted ? " · 행동 완료" : ""}
          </small>
        )}
      </div>

      {state.attackChoices.length > 1 && (
        <div className="tactical-choice-row" aria-label="공격 방식 선택">
          {state.attackChoices.map((choice) => (
            <button
              type="button"
              key={choice.id}
              className="tactical-choice"
              onClick={() => onCommand({ type: "attack", modeId: choice.id })}
            >
              <b>{choice.id === "melee" ? "⚔" : "➶"}</b>
              <span>{choice.label}<small>피해 {choice.damage}</small></span>
            </button>
          ))}
        </div>
      )}

      {state.skillMenuOpen && state.actorKind === "hero" && (
        <div className="tactical-skill-list">
          {state.skills.map((skill) => (
            <button
              type="button"
              key={skill.id}
              disabled={skill.remainingUses <= 0 || state.acted}
              onClick={() => onCommand({ type: "use-skill", skillId: skill.id })}
            >
              <span>{skill.kind === "heal" ? "✚" : "✦"} {skill.label}</span>
              <small>{skill.remainingUses}/{skill.maxUses}</small>
            </button>
          ))}
        </div>
      )}

      <div className="tactical-actions">
        {state.actorName ? (
          <>
            <button
              type="button"
              className="secondary"
              disabled={state.acted}
              onClick={() => onCommand({ type: "wait" })}
            >
              대기
            </button>
            {state.actorKind === "hero" && (
              <button
                type="button"
                className="secondary"
                disabled={state.acted}
                onClick={() => onCommand({ type: "toggle-skills" })}
              >
                스킬
              </button>
            )}
            <button
              type="button"
              className="secondary"
              onClick={() => onCommand({ type: "cancel" })}
            >
              선택 취소
            </button>
          </>
        ) : (
          <span>영웅 또는 병사를 선택하세요.</span>
        )}
        <button
          type="button"
          className="tactical-reset"
          onClick={() => onCommand({ type: "reset-turn" })}
        >
          테스트 턴 초기화
        </button>
      </div>
    </aside>
  );
}
