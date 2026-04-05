export type PlayerClassId = "vanguard" | "duelist" | "warden";

export interface PlayerClassDefinition {
    readonly id: PlayerClassId;
    readonly displayName: string;
    readonly description: string;
    /** Bonus max HP applied once at class selection (stacks with base config). */
    readonly bonusMaxHp: number;
    /** Multiplier applied to combo hit damage (after skill bonuses). */
    readonly comboDamageMultiplier: number;
    /** Multiplier for dash strike damage. */
    readonly dashStrikeDamageMultiplier: number;
    /** Multiplier for spin slash damage. */
    readonly spinSlashDamageMultiplier: number;
    /** Seconds subtracted from dodge cooldown (minimum handled in combat). */
    readonly dodgeCooldownReduction: number;
    /** Multiplier on melee damage when striking during the post-guard riposte window. */
    readonly riposteDamageMultiplier: number;
}

export const PLAYER_CLASSES: Record<PlayerClassId, PlayerClassDefinition> = {
    vanguard: {
        id: "vanguard",
        displayName: "Vanguard",
        description: "Front-line bruiser: more HP, harder hits, slower dodge recovery.",
        bonusMaxHp: 35,
        comboDamageMultiplier: 1.12,
        dashStrikeDamageMultiplier: 1.15,
        spinSlashDamageMultiplier: 1.05,
        dodgeCooldownReduction: 0.15,
        riposteDamageMultiplier: 1.1,
    },
    duelist: {
        id: "duelist",
        displayName: "Duelist",
        description: "Balanced striker: standard survivability, strong combo damage.",
        bonusMaxHp: 0,
        comboDamageMultiplier: 1.18,
        dashStrikeDamageMultiplier: 1.0,
        spinSlashDamageMultiplier: 1.08,
        dodgeCooldownReduction: 0,
        riposteDamageMultiplier: 1.06,
    },
    warden: {
        id: "warden",
        displayName: "Warden",
        description: "Sturdy guardian: extra HP, favors AoE spin slash, quicker dodge.",
        bonusMaxHp: 55,
        comboDamageMultiplier: 0.95,
        dashStrikeDamageMultiplier: 0.95,
        spinSlashDamageMultiplier: 1.2,
        dodgeCooldownReduction: -0.12,
        riposteDamageMultiplier: 1.18,
    },
};

export const DEFAULT_PLAYER_CLASS_ID: PlayerClassId = "duelist";

export function getPlayerClass(id: PlayerClassId): PlayerClassDefinition {
    return PLAYER_CLASSES[id];
}
