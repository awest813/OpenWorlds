import { ItemId, ITEM_IDS, getItemDef } from "./ItemDefinitions";

/** One weighted row in a loot table. Quantities are inclusive. */
export interface LootTableEntry {
    readonly itemId: ItemId;
    /** Relative weight; need not sum to 100. */
    readonly weight: number;
    readonly minQty: number;
    readonly maxQty: number;
}

export interface LootDrop {
    readonly itemId: ItemId;
    readonly quantity: number;
}

export interface LootTable {
    readonly id: string;
    readonly displayName: string;
    readonly entries: readonly LootTableEntry[];
}

/** A single rolled drop line for UI / inventory hooks. */
export interface LootRollResult {
    readonly tableId: string;
    readonly drops: LootDrop[];
}

function randomIntInclusive(min: number, max: number, rng: () => number): number {
    if (max <= min) return min;
    return min + Math.floor(rng() * (max - min + 1));
}

/**
 * Picks one entry by weight, then rolls quantity. Call multiple times for multi-pick tables.
 */
export function rollLootTableEntry(table: LootTable, rng: () => number = Math.random): LootDrop | null {
    const total = table.entries.reduce((s, e) => s + e.weight, 0);
    if (total <= 0 || table.entries.length === 0) return null;
    let roll = rng() * total;
    for (const e of table.entries) {
        roll -= e.weight;
        if (roll <= 0) {
            const qty = randomIntInclusive(e.minQty, e.maxQty, rng);
            if (qty <= 0) return null;
            return { itemId: e.itemId, quantity: qty };
        }
    }
    const last = table.entries[table.entries.length - 1];
    const qty = randomIntInclusive(last.minQty, last.maxQty, rng);
    return qty > 0 ? { itemId: last.itemId, quantity: qty } : null;
}

/** Standard hub scout encounter — gold plus a chance at badge or salve. */
export const LOOT_TABLE_SCOUT_ENCOUNTER: LootTable = {
    id: "scout_encounter",
    displayName: "Scout spoils",
    entries: [
        { itemId: ITEM_IDS.GOLD, weight: 40, minQty: 8, maxQty: 22 },
        { itemId: ITEM_IDS.SCOUT_BADGE, weight: 25, minQty: 1, maxQty: 1 },
        { itemId: ITEM_IDS.HEALING_SALVE, weight: 20, minQty: 1, maxQty: 2 },
        { itemId: ITEM_IDS.IRON_SHARD, weight: 15, minQty: 1, maxQty: 3 },
    ],
};

/** Arena test encounter — slightly richer gold, fewer rares. */
export const LOOT_TABLE_ARENA_SPARRING: LootTable = {
    id: "arena_sparring",
    displayName: "Sparring chest",
    entries: [
        { itemId: ITEM_IDS.GOLD, weight: 55, minQty: 12, maxQty: 30 },
        { itemId: ITEM_IDS.HEALING_SALVE, weight: 30, minQty: 1, maxQty: 1 },
        { itemId: ITEM_IDS.IRON_SHARD, weight: 15, minQty: 1, maxQty: 2 },
    ],
};

/** Second wave in the hub scout fight — heavier hitters, slightly better spoils. */
export const LOOT_TABLE_SCOUT_REINFORCEMENTS: LootTable = {
    id: "scout_reinforcements",
    displayName: "Reinforcement spoils",
    entries: [
        { itemId: ITEM_IDS.GOLD, weight: 42, minQty: 14, maxQty: 32 },
        { itemId: ITEM_IDS.SCOUT_BADGE, weight: 22, minQty: 1, maxQty: 2 },
        { itemId: ITEM_IDS.HEALING_SALVE, weight: 22, minQty: 1, maxQty: 3 },
        { itemId: ITEM_IDS.IRON_SHARD, weight: 14, minQty: 2, maxQty: 5 },
    ],
};

const TABLES_BY_ID: Record<string, LootTable> = {
    [LOOT_TABLE_SCOUT_ENCOUNTER.id]: LOOT_TABLE_SCOUT_ENCOUNTER,
    [LOOT_TABLE_ARENA_SPARRING.id]: LOOT_TABLE_ARENA_SPARRING,
    [LOOT_TABLE_SCOUT_REINFORCEMENTS.id]: LOOT_TABLE_SCOUT_REINFORCEMENTS,
};

export function getLootTable(id: string): LootTable | undefined {
    return TABLES_BY_ID[id];
}

/**
 * Rolls `pickCount` independent picks from the table (with replacement between picks).
 * Typical encounter: pickCount 1–2.
 */
export function rollLootFromTableId(
    tableId: string,
    pickCount: number,
    rng: () => number = Math.random
): LootRollResult | null {
    const table = getLootTable(tableId);
    if (!table || pickCount <= 0) return null;
    const drops: LootDrop[] = [];
    for (let i = 0; i < pickCount; i++) {
        const d = rollLootTableEntry(table, rng);
        if (d) drops.push(d);
    }
    return { tableId, drops };
}

export function mergeLootDrops(drops: LootDrop[]): LootDrop[] {
    const map = new Map<ItemId, number>();
    for (const d of drops) {
        map.set(d.itemId, (map.get(d.itemId) ?? 0) + d.quantity);
    }
    return Array.from(map.entries()).map(([itemId, quantity]) => ({ itemId, quantity }));
}

export function formatLootSummary(drops: LootDrop[]): string {
    if (drops.length === 0) return "";
    return drops.map((d) => `${d.quantity}× ${getItemDef(d.itemId).displayName}`).join(", ");
}
