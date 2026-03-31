import { EnemyController } from "../combat/EnemyController";

export enum EncounterState {
    Active = "Active",
    Clear = "Clear",
}

/** Minimal post-combat reward data. Extend later with loot, unlocks, etc. */
export interface EncounterReward {
    xp: number;
}

/**
 * Tracks an encounter — a group of enemies that must be defeated together.
 *
 * Responsibilities:
 *  - Watch enemy alive-states each frame.
 *  - Fire `onClear` once all enemies are dead.
 *  - Carry a lightweight reward payload (XP hook for future progression).
 *
 * Intentionally simple: no wave system, no respawn logic yet.
 * Just enough to prove the post-combat flow exists cleanly.
 */
export class EncounterManager {
    private state: EncounterState = EncounterState.Active;
    private readonly enemies: readonly EnemyController[];
    private readonly reward: EncounterReward;

    /** Called once when the last enemy falls. Receives the reward data. */
    onClear: ((reward: EncounterReward) => void) | null = null;

    constructor(enemies: EnemyController[], reward: EncounterReward) {
        this.enemies = enemies;
        this.reward = reward;
    }

    update(_dt: number): void {
        if (this.state !== EncounterState.Active) return;
        if (this.enemies.length > 0 && this.enemies.every((e) => !e.isAlive())) {
            this.state = EncounterState.Clear;
            this.onClear?.(this.reward);
        }
    }

    getState(): EncounterState {
        return this.state;
    }

    getReward(): EncounterReward {
        return this.reward;
    }

    isClear(): boolean {
        return this.state === EncounterState.Clear;
    }
}
