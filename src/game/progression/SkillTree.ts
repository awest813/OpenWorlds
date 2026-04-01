import { PlayerClassId } from "./PlayerClass";

export type SkillNodeId =
    | "vg_vitality_1"
    | "vg_vitality_2"
    | "vg_blade_1"
    | "vg_blade_2"
    | "vg_iron_march"
    | "vg_linebreaker"
    | "dl_vitality_1"
    | "dl_vitality_2"
    | "dl_blade_1"
    | "dl_blade_2"
    | "dl_tempo"
    | "dl_precision"
    | "wn_vitality_1"
    | "wn_vitality_2"
    | "wn_blade_1"
    | "wn_blade_2"
    | "wn_circle"
    | "wn_bulwark";

export interface SkillNodeDefinition {
    readonly id: SkillNodeId;
    readonly displayName: string;
    readonly description: string;
    readonly requires?: SkillNodeId;
    readonly cost: number;
    readonly maxRank: number;
    readonly classId: PlayerClassId;
    readonly perRank: {
        readonly maxHp?: number;
        readonly comboDamagePct?: number;
        /** Applies to dash strike and spin slash. */
        readonly abilityDamagePct?: number;
        readonly dashDamagePct?: number;
        readonly spinDamagePct?: number;
        readonly dodgeCooldownReduction?: number;
    };
}

export const SKILL_NODES: SkillNodeDefinition[] = [
    {
        id: "vg_vitality_1",
        displayName: "Vitality I",
        description: "+12 max HP.",
        cost: 1,
        maxRank: 1,
        classId: "vanguard",
        perRank: { maxHp: 12 },
    },
    {
        id: "vg_vitality_2",
        displayName: "Vitality II",
        description: "+15 max HP. Requires Vitality I.",
        requires: "vg_vitality_1",
        cost: 1,
        maxRank: 1,
        classId: "vanguard",
        perRank: { maxHp: 15 },
    },
    {
        id: "vg_blade_1",
        displayName: "Blade Practice I",
        description: "+6% combo damage.",
        cost: 1,
        maxRank: 1,
        classId: "vanguard",
        perRank: { comboDamagePct: 0.06 },
    },
    {
        id: "vg_blade_2",
        displayName: "Blade Practice II",
        description: "+8% combo damage.",
        requires: "vg_blade_1",
        cost: 1,
        maxRank: 1,
        classId: "vanguard",
        perRank: { comboDamagePct: 0.08 },
    },
    {
        id: "vg_iron_march",
        displayName: "Iron March",
        description: "+25 max HP.",
        requires: "vg_vitality_1",
        cost: 2,
        maxRank: 1,
        classId: "vanguard",
        perRank: { maxHp: 25 },
    },
    {
        id: "vg_linebreaker",
        displayName: "Linebreaker",
        description: "+12% dash strike damage.",
        requires: "vg_blade_1",
        cost: 2,
        maxRank: 1,
        classId: "vanguard",
        perRank: { dashDamagePct: 0.12 },
    },
    {
        id: "dl_vitality_1",
        displayName: "Vitality I",
        description: "+10 max HP.",
        cost: 1,
        maxRank: 1,
        classId: "duelist",
        perRank: { maxHp: 10 },
    },
    {
        id: "dl_vitality_2",
        displayName: "Vitality II",
        description: "+12 max HP.",
        requires: "dl_vitality_1",
        cost: 1,
        maxRank: 1,
        classId: "duelist",
        perRank: { maxHp: 12 },
    },
    {
        id: "dl_blade_1",
        displayName: "Blade Practice I",
        description: "+8% combo damage.",
        cost: 1,
        maxRank: 1,
        classId: "duelist",
        perRank: { comboDamagePct: 0.08 },
    },
    {
        id: "dl_blade_2",
        displayName: "Blade Practice II",
        description: "+10% combo damage.",
        requires: "dl_blade_1",
        cost: 1,
        maxRank: 1,
        classId: "duelist",
        perRank: { comboDamagePct: 0.1 },
    },
    {
        id: "dl_tempo",
        displayName: "Tempo",
        description: "-0.08s dodge cooldown.",
        requires: "dl_blade_1",
        cost: 2,
        maxRank: 1,
        classId: "duelist",
        perRank: { dodgeCooldownReduction: -0.08 },
    },
    {
        id: "dl_precision",
        displayName: "Precision",
        description: "+10% dash and spin damage.",
        requires: "dl_blade_2",
        cost: 2,
        maxRank: 1,
        classId: "duelist",
        perRank: { abilityDamagePct: 0.1 },
    },
    {
        id: "wn_vitality_1",
        displayName: "Vitality I",
        description: "+14 max HP.",
        cost: 1,
        maxRank: 1,
        classId: "warden",
        perRank: { maxHp: 14 },
    },
    {
        id: "wn_vitality_2",
        displayName: "Vitality II",
        description: "+18 max HP.",
        requires: "wn_vitality_1",
        cost: 1,
        maxRank: 1,
        classId: "warden",
        perRank: { maxHp: 18 },
    },
    {
        id: "wn_blade_1",
        displayName: "Blade Practice I",
        description: "+5% combo damage.",
        cost: 1,
        maxRank: 1,
        classId: "warden",
        perRank: { comboDamagePct: 0.05 },
    },
    {
        id: "wn_blade_2",
        displayName: "Blade Practice II",
        description: "+7% combo damage.",
        requires: "wn_blade_1",
        cost: 1,
        maxRank: 1,
        classId: "warden",
        perRank: { comboDamagePct: 0.07 },
    },
    {
        id: "wn_circle",
        displayName: "Warding Circle",
        description: "+15% spin slash damage.",
        requires: "wn_blade_1",
        cost: 2,
        maxRank: 1,
        classId: "warden",
        perRank: { spinDamagePct: 0.15 },
    },
    {
        id: "wn_bulwark",
        displayName: "Bulwark",
        description: "+20 max HP.",
        requires: "wn_vitality_1",
        cost: 2,
        maxRank: 1,
        classId: "warden",
        perRank: { maxHp: 20 },
    },
];

const NODES_BY_ID_CLASS = new Map<string, SkillNodeDefinition>();
for (const n of SKILL_NODES) {
    NODES_BY_ID_CLASS.set(`${n.classId}:${n.id}`, n);
}

export function getSkillNodesForClass(classId: PlayerClassId): SkillNodeDefinition[] {
    return SKILL_NODES.filter((n) => n.classId === classId);
}

export function getSkillNode(classId: PlayerClassId, id: SkillNodeId): SkillNodeDefinition | undefined {
    return NODES_BY_ID_CLASS.get(`${classId}:${id}`);
}

export interface SkillBonuses {
    maxHp: number;
    comboDamageMultiplier: number;
    dashDamageMultiplier: number;
    spinDamageMultiplier: number;
    dodgeCooldownDelta: number;
}

export function emptySkillBonuses(): SkillBonuses {
    return {
        maxHp: 0,
        comboDamageMultiplier: 1,
        dashDamageMultiplier: 1,
        spinDamageMultiplier: 1,
        dodgeCooldownDelta: 0,
    };
}

function addBonuses(target: SkillBonuses, node: SkillNodeDefinition, ranks: number): void {
    const r = Math.max(0, ranks);
    if (r === 0) return;
    const p = node.perRank;
    if (p.maxHp) target.maxHp += p.maxHp * r;
    if (p.comboDamagePct) target.comboDamageMultiplier += p.comboDamagePct * r;
    if (p.abilityDamagePct) {
        target.dashDamageMultiplier += p.abilityDamagePct * r;
        target.spinDamageMultiplier += p.abilityDamagePct * r;
    }
    if (p.dashDamagePct) target.dashDamageMultiplier += p.dashDamagePct * r;
    if (p.spinDamagePct) target.spinDamageMultiplier += p.spinDamagePct * r;
    if (p.dodgeCooldownReduction !== undefined) target.dodgeCooldownDelta += p.dodgeCooldownReduction * r;
}

export class SkillTreeState {
    private readonly ranks = new Map<SkillNodeId, number>();
    private skillPoints = 0;
    private appliedSkillMaxHp = 0;

    constructor(
        private readonly classId: PlayerClassId,
        private readonly onMaxHpFromSkillsChanged?: (delta: number) => void
    ) {}

    getClassId(): PlayerClassId {
        return this.classId;
    }

    getSkillPoints(): number {
        return this.skillPoints;
    }

    grantSkillPoints(n: number): void {
        if (n <= 0) return;
        this.skillPoints += n;
    }

    getRank(nodeId: SkillNodeId): number {
        return this.ranks.get(nodeId) ?? 0;
    }

    getBonuses(): SkillBonuses {
        const out = emptySkillBonuses();
        for (const node of getSkillNodesForClass(this.classId)) {
            addBonuses(out, node, this.getRank(node.id));
        }
        return out;
    }

    canUnlock(nodeId: SkillNodeId): boolean {
        const node = getSkillNode(this.classId, nodeId);
        if (!node) return false;
        if (this.getRank(nodeId) >= node.maxRank) return false;
        if (this.skillPoints < node.cost) return false;
        if (node.requires !== undefined && this.getRank(node.requires) < 1) return false;
        return true;
    }

    tryUnlock(nodeId: SkillNodeId): boolean {
        if (!this.canUnlock(nodeId)) return false;
        const node = getSkillNode(this.classId, nodeId);
        if (!node) return false;
        this.skillPoints -= node.cost;
        this.ranks.set(nodeId, this.getRank(nodeId) + 1);
        this.reapplySkillMaxHp();
        return true;
    }

    private reapplySkillMaxHp(): void {
        const bonusHp = this.getBonuses().maxHp;
        const delta = bonusHp - this.appliedSkillMaxHp;
        if (delta === 0) return;
        this.appliedSkillMaxHp = bonusHp;
        this.onMaxHpFromSkillsChanged?.(delta);
    }

    /** Call when max HP was rebuilt externally (e.g. class swap) so the next skill purchase deltas stay correct. */
    syncAppliedSkillMaxHp(currentBonusFromSkills: number): void {
        this.appliedSkillMaxHp = currentBonusFromSkills;
    }
}
