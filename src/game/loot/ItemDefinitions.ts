/**
 * Canonical item ids for drops, quests, and UI. Extend with icons / stacking later.
 */
export const ITEM_IDS = {
    GOLD: "gold",
    SCOUT_BADGE: "scout_badge",
    HEALING_SALVE: "healing_salve",
    IRON_SHARD: "iron_shard",
} as const;

export type ItemId = (typeof ITEM_IDS)[keyof typeof ITEM_IDS];

export interface ItemDefinition {
    readonly id: ItemId;
    readonly displayName: string;
    /** Short hint for HUD toasts. */
    readonly description: string;
}

export const ITEM_DEFINITIONS: Record<ItemId, ItemDefinition> = {
    [ITEM_IDS.GOLD]: {
        id: ITEM_IDS.GOLD,
        displayName: "Gold",
        description: "Currency — useful for trade when the economy exists.",
    },
    [ITEM_IDS.SCOUT_BADGE]: {
        id: ITEM_IDS.SCOUT_BADGE,
        displayName: "Scout Badge",
        description: "Trophy from a defeated scout.",
    },
    [ITEM_IDS.HEALING_SALVE]: {
        id: ITEM_IDS.HEALING_SALVE,
        displayName: "Healing Salve",
        description: "Restores a little health when used.",
    },
    [ITEM_IDS.IRON_SHARD]: {
        id: ITEM_IDS.IRON_SHARD,
        displayName: "Iron Shard",
        description: "Crafting material.",
    },
};

export function getItemDef(id: ItemId): ItemDefinition {
    return ITEM_DEFINITIONS[id];
}
