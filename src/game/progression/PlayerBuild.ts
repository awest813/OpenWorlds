import { HealthComponent } from "../combat/HealthComponent";
import { COMBAT_CONFIG } from "../combat/CombatConfig";
import { ItemId, ITEM_IDS, getItemDef } from "../loot/ItemDefinitions";
import { LootDrop, mergeLootDrops } from "../loot/LootTables";
import { DEFAULT_PLAYER_CLASS_ID, getPlayerClass, PlayerClassId } from "./PlayerClass";
import { getSkillNodesForClass, SkillNodeDefinition, SkillTreeState } from "./SkillTree";
import { PlayerProgression } from "./PlayerProgression";

const STORAGE_CLASS = "thornwall_player_class";

function readStoredClass(): PlayerClassId {
    try {
        const raw = localStorage.getItem(STORAGE_CLASS);
        if (raw === "vanguard" || raw === "duelist" || raw === "warden") return raw;
    } catch {
        /* ignore */
    }
    return DEFAULT_PLAYER_CLASS_ID;
}

function writeStoredClass(id: PlayerClassId): void {
    try {
        localStorage.setItem(STORAGE_CLASS, id);
    } catch {
        /* ignore */
    }
}

/**
 * Class choice, skill tree, loot inventory, and combat stat derivations.
 * Level-up HP stays on {@link PlayerProgression}; this layer only adjusts class and skill vitality.
 */
export class PlayerBuild {
    private skillTreeState: SkillTreeState;
    private classId: PlayerClassId;
    private gold = 0;
    private readonly inventory = new Map<ItemId, number>();

    constructor(private readonly health: HealthComponent, private readonly progression: PlayerProgression) {
        this.classId = readStoredClass();
        const cls = getPlayerClass(this.classId);
        this.health.adjustMaxHp(cls.bonusMaxHp);

        this.skillTreeState = new SkillTreeState(this.classId, (delta) => {
            this.health.growMaxHp(delta);
        });
        this.skillTreeState.grantSkillPoints(Math.max(0, this.progression.getLevel()));
    }

    get skillTree(): SkillTreeState {
        return this.skillTreeState;
    }

    getClassId(): PlayerClassId {
        return this.classId;
    }

    getClassDisplayName(): string {
        return getPlayerClass(this.classId).displayName;
    }

    cycleClass(): void {
        const order: PlayerClassId[] = ["vanguard", "duelist", "warden"];
        const nextId = order[(order.indexOf(this.classId) + 1) % order.length];
        const prev = getPlayerClass(this.classId);
        const next = getPlayerClass(nextId);

        const oldSkillHp = this.skillTreeState.getBonuses().maxHp;
        this.health.adjustMaxHp(-oldSkillHp);
        this.health.adjustMaxHp(next.bonusMaxHp - prev.bonusMaxHp);

        this.classId = nextId;
        writeStoredClass(nextId);

        const bankedPoints = this.skillTreeState.getSkillPoints();
        this.skillTreeState = new SkillTreeState(this.classId, (delta) => {
            this.health.growMaxHp(delta);
        });
        this.skillTreeState.grantSkillPoints(bankedPoints + 1);
    }

    /** Grant one skill point per level-up (HP still handled by {@link PlayerProgression}). */
    onLevelUp(): void {
        this.skillTreeState.grantSkillPoints(1);
    }

    getGold(): number {
        return this.gold;
    }

    getInventoryCount(itemId: ItemId): number {
        return this.inventory.get(itemId) ?? 0;
    }

    getInventoryEntries(): Array<{ itemId: ItemId; count: number }> {
        return Array.from(this.inventory.entries())
            .filter(([, count]) => count > 0)
            .map(([itemId, count]) => ({ itemId, count }));
    }

    applyLootDrops(drops: LootDrop[]): string[] {
        const merged = mergeLootDrops(drops);
        const lines: string[] = [];
        for (const d of merged) {
            if (d.itemId === ITEM_IDS.GOLD) {
                this.gold += d.quantity;
                lines.push(`${d.quantity} gold`);
                continue;
            }
            if (d.itemId === ITEM_IDS.HEALING_SALVE) {
                const heal = 15 * d.quantity;
                this.health.heal(heal);
                lines.push(`${d.quantity}× salve (+${heal} HP)`);
                continue;
            }
            this.inventory.set(d.itemId, (this.inventory.get(d.itemId) ?? 0) + d.quantity);
            lines.push(`${d.quantity}× ${getItemDef(d.itemId).displayName}`);
        }
        return lines;
    }

    getComboDamageMultiplier(): number {
        const c = getPlayerClass(this.classId);
        const s = this.skillTreeState.getBonuses();
        return c.comboDamageMultiplier * s.comboDamageMultiplier;
    }

    getDashStrikeDamageMultiplier(): number {
        const c = getPlayerClass(this.classId);
        const s = this.skillTreeState.getBonuses();
        return c.dashStrikeDamageMultiplier * s.dashDamageMultiplier;
    }

    getSpinSlashDamageMultiplier(): number {
        const c = getPlayerClass(this.classId);
        const s = this.skillTreeState.getBonuses();
        return c.spinSlashDamageMultiplier * s.spinDamageMultiplier;
    }

    getDodgeCooldownSeconds(): number {
        const c = getPlayerClass(this.classId);
        const s = this.skillTreeState.getBonuses();
        return Math.max(0.25, COMBAT_CONFIG.DODGE_COOLDOWN + c.dodgeCooldownReduction + s.dodgeCooldownDelta);
    }

    getRiposteDamageMultiplier(): number {
        return getPlayerClass(this.classId).riposteDamageMultiplier;
    }

    /** Nodes that can be purchased this frame, in tree order (for hotkeys 1–9). */
    listUnlockableSkillNodes(): SkillNodeDefinition[] {
        return getSkillNodesForClass(this.classId).filter((n) => this.skillTreeState.canUnlock(n.id));
    }
}
