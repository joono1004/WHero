"use client";

import type { Ref } from "react";

import type { TacticalSkill } from "@/lib/world/prototype/tactical-interaction";
import {
  RESOURCE_SITE_LABELS,
  type ResourceSiteKind,
} from "@/lib/world/prototype/resource-site-visual";

export type TacticalAttackChoice = {
  id: "melee" | "ranged";
  label: string;
  damage: number;
};

export type TacticalPanelState = {
  isOpen: boolean;
  panelKind: "actor" | "structure" | null;
  actorName: string | null;
  actorKind: "hero" | "unit" | null;
  message: string;
  canAttack: boolean;
  skills: TacticalSkill[];
  attackChoices: TacticalAttackChoice[];
  skillMenuOpen: boolean;
  attackTargeting: boolean;
  canCancelMove: boolean;
  canFoundOutpost: boolean;
  upgradeTargetLevel: 2 | 3 | 4 | null;
  canBuildResource: boolean;
  resourceMenuOpen: boolean;
  resourceCount: number;
  resourceCapacity: number;
};

export type TacticalPanelCommand =
  | { type: "wait" }
  | { type: "start-attack" }
  | { type: "cancel-attack" }
  | { type: "cancel-move" }
  | { type: "found-outpost" }
  | { type: "upgrade-outpost" }
  | { type: "toggle-resource-menu" }
  | { type: "select-resource"; resourceKind: ResourceSiteKind }
  | { type: "cancel-resource-build" }
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
  const skillUses = state.skills.reduce(
    (total, skill) => total + skill.remainingUses,
    0,
  );
  const resourceKinds: ResourceSiteKind[] = [
    "farm",
    "logging",
    "mine",
    "market",
  ];
  const resourceIcons: Record<ResourceSiteKind, string> = {
    farm: "🌾",
    logging: "🪵",
    mine: "⛏",
    market: "🏪",
  };

  return (
    <aside
      ref={panelRef}
      className={[
        "tactical-action-panel",
        state.isOpen ? "is-active" : "",
        state.attackChoices.length > 1 || state.skillMenuOpen || state.resourceMenuOpen
          ? "has-submenu"
          : "",
        state.resourceMenuOpen ? "has-resource-menu" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onPointerDown={(event) => event.stopPropagation()}
      aria-hidden={!state.isOpen}
    >
      {state.message && !state.attackTargeting && (
        <div className="tactical-status">
          <strong>{state.message}</strong>
        </div>
      )}

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

      {state.resourceMenuOpen && state.panelKind === "structure" && (
        <div className="resource-build-menu" aria-label="자원 거점 선택">
          <div className="resource-build-heading">
            <strong>자원 거점 건설</strong>
            <small>{state.resourceCount}/{state.resourceCapacity}</small>
          </div>
          <div className="resource-build-grid">
            {resourceKinds.map((kind) => (
              <button
                type="button"
                key={kind}
                className={`resource-build-card resource-${kind}`}
                onClick={() =>
                  onCommand({ type: "select-resource", resourceKind: kind })
                }
              >
                <span className="resource-card-art" aria-hidden="true">
                  {resourceIcons[kind]}
                </span>
                <b>{RESOURCE_SITE_LABELS[kind]}</b>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="tactical-actions">
        {state.panelKind === "structure" ? (
          <>
            <button
              type="button"
              className="tactical-command tactical-build-resource"
              disabled={!state.canBuildResource}
              onClick={() => onCommand({ type: "toggle-resource-menu" })}
            >
              <span>{state.resourceMenuOpen ? "건설 닫기" : "건설"}</span>
              <small>{state.resourceCount}/{state.resourceCapacity}</small>
            </button>
            {state.upgradeTargetLevel && (
              <button
                type="button"
                className="tactical-command tactical-upgrade-outpost"
                onClick={() => onCommand({ type: "upgrade-outpost" })}
              >
                <span>증축 Lv.{state.upgradeTargetLevel}</span>
              </button>
            )}
            <button
              type="button"
              className="tactical-command tactical-info"
              onClick={() => onCommand({ type: "info" })}
            >
              <span>정보</span>
            </button>
          </>
        ) : state.attackTargeting || state.attackChoices.length > 1 ? (
          <button
            type="button"
            className="tactical-command tactical-attack-cancel"
            onClick={() => onCommand({ type: "cancel-attack" })}
          >
            <span>공격 취소</span>
          </button>
        ) : (
          <>
        {state.canAttack && (
          <button
            type="button"
            className="tactical-command tactical-attack"
            onClick={() => onCommand({ type: "start-attack" })}
          >
            <span>공격</span>
          </button>
        )}
        <button
          type="button"
          className="tactical-command tactical-wait"
          onClick={() => onCommand({ type: "wait" })}
        >
          <span>대기</span>
        </button>
        {state.actorKind === "hero" && (
          <>
            {state.canFoundOutpost && (
              <button
                type="button"
                className="tactical-command tactical-found-outpost"
                onClick={() => onCommand({ type: "found-outpost" })}
              >
                <span>주둔지 건설</span>
              </button>
            )}
            <button
              type="button"
              className="tactical-command tactical-skill"
              disabled={state.skills.length === 0}
              onClick={() => onCommand({ type: "toggle-skills" })}
            >
              <span>스킬</span>
              <small>x {String(skillUses).padStart(2, "0")}</small>
            </button>
          </>
        )}
        <button
          type="button"
          className="tactical-command tactical-info"
          onClick={() => onCommand({ type: "info" })}
        >
          <span>정보</span>
        </button>
        {state.canCancelMove && (
          <button
            type="button"
            className="tactical-command tactical-move-cancel"
            onClick={() => onCommand({ type: "cancel-move" })}
          >
            <span>이동 취소</span>
          </button>
        )}
          </>
        )}
      </div>
    </aside>
  );
}
