/** States a quest can be in, in order. */
export enum QuestState {
    NotStarted = "NotStarted",
    Active = "Active",
    Completable = "Completable",
    Completed = "Completed",
}

export interface QuestReward {
    xp: number;
    healAmount?: number;
    goldText?: string;
}

export interface QuestObjectiveData {
    description: string;
    required: number;
}

export interface QuestDef {
    id: string;
    title: string;
    giver: string;
    description: string;
    objective: QuestObjectiveData;
    reward: QuestReward;
}

/** The first quest: clear bandit scouts from the outpost perimeter. */
export const QUEST_CLEAR_SCOUTS: QuestDef = {
    id: "quest_clear_scouts",
    title: "Drive Out the Scouts",
    giver: "Elder Maren",
    description: "Bandit scouts are circling the outpost. Clear all three.",
    objective: {
        description: "Defeat bandit scouts",
        required: 3,
    },
    reward: {
        xp: 150,
        healAmount: 50,
        goldText: "50 Gold",
    },
};

/** Second hub quest: gather herbs for the outpost. */
export const QUEST_BITTERLEAF_FOR_MAREN: QuestDef = {
    id: "quest_bitterleaf_maren",
    title: "Bitterleaf for the Kettle",
    giver: "Elder Maren",
    description: "The elder needs bitterleaf for a stew that might help the wounded — or at least improve morale.",
    objective: {
        description: "Gather bitterleaf",
        required: 3,
    },
    reward: {
        xp: 90,
        healAmount: 25,
        goldText: "20 Gold (allegedly)",
    },
};

/** Third hub quest: gather exposed iron ore from the outpost grounds. */
export const QUEST_IRON_IN_THE_EARTH: QuestDef = {
    id: "quest_iron_earth",
    title: "Iron in the Earth",
    giver: "Elder Maren",
    description: "Exposed iron ore near the perimeter walls — not much, but Thornwall's armory will take what it can get.",
    objective: {
        description: "Collect iron ore",
        required: 3,
    },
    reward: {
        xp: 120,
        healAmount: 20,
        goldText: "30 Gold",
    },
};

/** Fourth hub quest: recover supply caches left by the scattered scouts. */
export const QUEST_PATROL_CACHES: QuestDef = {
    id: "quest_patrol_caches",
    title: "Patrol Caches",
    giver: "Sergeant Edra",
    description: "The scouts dropped supply sacks near the gate when they fled. Recover them before bandits return.",
    objective: {
        description: "Recover supply cache",
        required: 2,
    },
    reward: {
        xp: 160,
        healAmount: 30,
        goldText: "45 Gold",
    },
};
