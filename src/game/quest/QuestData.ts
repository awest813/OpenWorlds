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
