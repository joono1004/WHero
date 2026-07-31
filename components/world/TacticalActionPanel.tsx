"use client";

import type { Ref } from "react";

import type { TacticalSkill } from "@/lib/world/prototype/tactical-interaction";

export type TacticalAttackChoice = {
  id: "melee" | "ranged";
  label: string;
  damage: number;
};

export type TacticalPanelState = {
  isOpen: boolean;
  actorName: string | null;
  actorKind: "hero" | "unit" | null;
  message: string;
  canAttack: boolean;
  skills: TacticalSkill[];
  attackChoices: TacticalAttackChoice[];
  skillMenuOpen: boolean;
};

export type TacticalPanelCommand =
  | { type: "wait" }
  | { type: "start-attack" }
  | { type: "toggle-skills" }
  | { type: "use-skill"; skillId: string }
  | { type: "attack"; modeId: "melee" | "ranged" }
  | { type: "info" };

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
      className={`tactical-action-panel ${state.isOpen ? "is-active" : ""}`}
      onPointerDown={(event) => event.stopPropagation()}
      aria-hidden={!state.isOpen}
    >
      <div className="tactical-status">
        <span>{state.actorName}</span>
        {state.message && <strong>{state.message}</strong>}
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
              disabled={skill.remainingUses <= 0}
              onClick={() => onCommand({ type: "use-skill", skillId: skill.id })}
            >
              <span>{skill.kind === "heal" ? "✚" : "✦"} {skill.label}</span>
              <small>{skill.remainingUses}/{skill.maxUses}</small>
            </button>
          ))}
        </div>
      )}

      <div className="tactical-actions">
        {state.canAttack && (
          <button
            type="button"
            className="tactical-attack"
            onClick={() => onCommand({ type: "start-attack" })}
          >
            공격
          </button>
        )}
        <button
          type="button"
          className="secondary"
          onClick={() => onCommand({ type: "wait" })}
        >
          대기
        </button>
        {state.actorKind === "hero" && (
            <button
              type="button"
              className="secondary"
              disabled={state.skills.length === 0}
              onClick={() => onCommand({ type: "toggle-skills" })}
            >
              스킬 x {state.skills.reduce(
                (total, skill) => total + skill.remainingUses,
                0,
              )}
            </button>
        )}
        <button
          type="button"
          className="secondary"
          onClick={() => onCommand({ type: "info" })}
        >
          정보
        </button>
      </div>
    </aside>
  );
}
