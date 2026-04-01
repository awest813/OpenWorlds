import { HealthComponent } from "../combat/HealthComponent";

/**
 * Single-player "MMO" style XP bar and levels. Feeds the HUD and can raise
 * max HP on level-up so progression feels tangible.
 */
export class PlayerProgression {
    private level = 1;
    /** XP accumulated toward the next level (not lifetime total). */
    private xpTowardNext = 0;

    /** Max HP gained each time the player levels up. */
    private static readonly HP_PER_LEVEL = 8;

    constructor(private readonly health: HealthComponent) {}

    getLevel(): number {
        return this.level;
    }

    getXpTowardNext(): number {
        return this.xpTowardNext;
    }

    /** XP required to go from current level to level + 1. */
    getXpToNextLevel(): number {
        return PlayerProgression.xpRequiredForLevel(this.level);
    }

    getXpBarFraction(): number {
        const need = this.getXpToNextLevel();
        return need > 0 ? this.xpTowardNext / need : 0;
    }

    /**
     * Adds experience. Level-ups heal toward the new cap via growMaxHp and
     * fire optional callbacks for UI feedback.
     */
    gainXp(amount: number, onLevelUp?: (newLevel: number) => void): void {
        if (amount <= 0) return;
        this.xpTowardNext += amount;
        let guard = 0;
        while (this.xpTowardNext >= this.getXpToNextLevel() && guard < 100) {
            guard++;
            this.xpTowardNext -= this.getXpToNextLevel();
            this.level++;
            this.health.growMaxHp(PlayerProgression.HP_PER_LEVEL);
            onLevelUp?.(this.level);
        }
    }

    private static xpRequiredForLevel(level: number): number {
        return 100 + (level - 1) * 35;
    }
}
