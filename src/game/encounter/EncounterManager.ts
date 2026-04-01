import { EnemyController } from "../combat/EnemyController";
import { LootRollResult, mergeLootDrops, rollLootFromTableId } from "../loot/LootTables";

export enum EncounterState {
    Active = "Active",
    Clear = "Clear",
}

/** Post-combat reward: XP plus optional weighted loot table roll. */
export interface EncounterReward {
    xp: number;
    /** If set, this many independent weighted picks are rolled when the encounter clears. */
    lootTableId?: string;
    lootPickCount?: number;
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
    onClear: ((reward: EncounterReward, loot: LootRollResult | null) => void) | null = null;

    private lastLoot: LootRollResult | null = null;

    constructor(enemies: EnemyController[], reward: EncounterReward) {
        this.enemies = enemies;
        this.reward = reward;
    }

    update(_dt: number): void {
        if (this.state !== EncounterState.Active) return;
        if (this.enemies.length > 0 && this.enemies.every((e) => !e.isAlive())) {
            this.state = EncounterState.Clear;
            this.lastLoot = null;
            const tableId = this.reward.lootTableId;
            const picks = this.reward.lootPickCount ?? 0;
            if (tableId && picks > 0) {
                const rolled = rollLootFromTableId(tableId, picks);
                const merged = rolled && rolled.drops.length ? mergeLootDrops(rolled.drops) : [];
                this.lastLoot = merged.length ? { tableId, drops: merged } : null;
            }
            this.onClear?.(this.reward, this.lastLoot);
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

    getLastLoot(): LootRollResult | null {
        return this.lastLoot;
    }
}
