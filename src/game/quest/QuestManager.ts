import { QuestDef, QuestReward, QuestState } from "./QuestData";

export interface QuestEntry {
    def: QuestDef;
    state: QuestState;
    progress: number;
}

/**
 * Tracks registered quests and their current states.
 *
 * Data-driven and simple — one progress counter per quest.
 * Extend by registering additional QuestDef objects; the logic stays the same.
 */
export class QuestManager {
    private readonly quests = new Map<string, QuestEntry>();

    register(def: QuestDef): void {
        this.quests.set(def.id, { def, state: QuestState.NotStarted, progress: 0 });
    }

    acceptQuest(id: string): void {
        const q = this.quests.get(id);
        if (!q || q.state !== QuestState.NotStarted) return;
        q.state = QuestState.Active;
    }

    getState(id: string): QuestState {
        return this.quests.get(id)?.state ?? QuestState.NotStarted;
    }

    getProgress(id: string): number {
        return this.quests.get(id)?.progress ?? 0;
    }

    getDef(id: string): QuestDef | null {
        return this.quests.get(id)?.def ?? null;
    }

    /** Increment the kill counter for a quest. Moves to Completable when objective is met. */
    recordKill(id: string): void {
        this.bumpProgress(id);
    }

    /** Increment gather / collection progress for an active quest. */
    recordGather(id: string): void {
        this.bumpProgress(id);
    }

    private bumpProgress(id: string): void {
        const q = this.quests.get(id);
        if (!q || q.state !== QuestState.Active) return;
        q.progress++;
        if (q.progress >= q.def.objective.required) {
            q.state = QuestState.Completable;
        }
    }

    /** Marks the quest complete and returns the reward, or null if not yet completable. */
    completeQuest(id: string): QuestReward | null {
        const q = this.quests.get(id);
        if (!q || q.state !== QuestState.Completable) return null;
        q.state = QuestState.Completed;
        return q.def.reward;
    }

    /** Returns the first quest that is Active or Completable, or null. */
    getActiveQuest(): QuestEntry | null {
        for (const q of this.quests.values()) {
            if (q.state === QuestState.Active || q.state === QuestState.Completable) {
                return q;
            }
        }
        return null;
    }
}
