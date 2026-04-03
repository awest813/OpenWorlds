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

/** Optional second wave after the first group is wiped (e.g. reinforcements). */
export interface EncounterReinforcementWave {
    reward: EncounterReward;
    spawn: () => EnemyController[];
}

/**
 * Tracks an encounter — a group of enemies that must be defeated together.
 *
 * Responsibilities:
 *  - Watch enemy alive-states each frame.
 *  - Fire `onClear` when a wave is finished (XP + loot for that wave).
 *  - Optional second wave: after the first clear, spawns new enemies and stays Active.
 *
 * `onSpawnNextWave` runs when reinforcements appear so the scene can register targets
 * and keep a shared enemy list in sync with the game loop.
 */
export class EncounterManager {
    private state: EncounterState = EncounterState.Active;
    private enemies: EnemyController[];
    private reward: EncounterReward;
    private readonly reinforcements: EncounterReinforcementWave | null;
    private waveIndex = 0;

    /** Called when each wave is cleared (first wave, then final wave if reinforcements exist). */
    onClear: ((reward: EncounterReward, loot: LootRollResult | null) => void) | null = null;

    /** Called immediately after reinforcement enemies are created (before their first update). */
    onSpawnNextWave: ((enemies: EnemyController[]) => void) | null = null;

    private lastLoot: LootRollResult | null = null;

    /** Set each time a wave is cleared (HUD / banner use the last value when encounter is fully clear). */
    private lastClearMeta: { reward: EncounterReward; wave: number; totalWaves: number } | null = null;

    constructor(
        enemies: EnemyController[],
        reward: EncounterReward,
        reinforcements?: EncounterReinforcementWave | null
    ) {
        this.enemies = enemies;
        this.reward = reward;
        this.reinforcements = reinforcements ?? null;
    }

    update(_dt: number): void {
        if (this.state !== EncounterState.Active) return;
        if (this.enemies.length === 0) return;
        if (!this.enemies.every((e) => !e.isAlive())) return;

        const totalWaves = this.reinforcements ? 2 : 1;
        const waveDisplay = this.waveIndex + 1;
        this.lastClearMeta = { reward: this.reward, wave: waveDisplay, totalWaves };

        this.lastLoot = null;
        const tableId = this.reward.lootTableId;
        const picks = this.reward.lootPickCount ?? 0;
        if (tableId && picks > 0) {
            const rolled = rollLootFromTableId(tableId, picks);
            const merged = rolled && rolled.drops.length ? mergeLootDrops(rolled.drops) : [];
            this.lastLoot = merged.length ? { tableId, drops: merged } : null;
        }
        this.onClear?.(this.reward, this.lastLoot);

        const next = this.reinforcements;
        if (this.waveIndex === 0 && next) {
            this.waveIndex = 1;
            this.reward = next.reward;
            this.enemies = next.spawn();
            this.onSpawnNextWave?.(this.enemies);
        } else {
            this.state = EncounterState.Clear;
        }
    }

    getState(): EncounterState {
        return this.state;
    }

    getReward(): EncounterReward {
        return this.reward;
    }

    /** 1-based index of the wave currently in play (or the wave that just cleared if state is Clear). */
    getWaveIndex(): number {
        return this.waveIndex + 1;
    }

    getTotalWaves(): number {
        return this.reinforcements ? 2 : 1;
    }

    isClear(): boolean {
        return this.state === EncounterState.Clear;
    }

    getLastLoot(): LootRollResult | null {
        return this.lastLoot;
    }

    getLastClearMeta(): { reward: EncounterReward; wave: number; totalWaves: number } | null {
        return this.lastClearMeta;
    }
}
