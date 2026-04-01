/**
 * Lightweight health container used by enemies (and later the player).
 * Fires optional callbacks on damage and death so consumers can react
 * without polling.
 */
export class HealthComponent {
    private current: number;
    private maxHealth: number;
    private dead = false;

    /** Called with the actual damage amount dealt each time the entity is hit. */
    onDamage: ((amount: number) => void) | null = null;
    /** Called once when health reaches zero. */
    onDeath: (() => void) | null = null;

    constructor(maxHp: number) {
        this.maxHealth = maxHp;
        this.current = maxHp;
    }

    /**
     * Raises the health ceiling (e.g. on level up). Current HP rises by the same
     * delta so a level-up feels rewarding without a full overheal exploit.
     */
    growMaxHp(delta: number): void {
        if (this.dead || delta <= 0) return;
        this.maxHealth += delta;
        this.current += delta;
    }

    /** Sets max HP directly (class respec, load). Optionally refills to full. */
    setMaxHealth(newMax: number, options?: { healToFull?: boolean }): void {
        if (this.dead || newMax <= 0) return;
        this.maxHealth = newMax;
        if (options?.healToFull) {
            this.current = newMax;
        } else {
            this.current = Math.min(this.current, newMax);
        }
    }

    /** Shifts max HP (class change, skill refund). Current HP is clamped to the new cap. */
    adjustMaxHp(delta: number): void {
        if (this.dead || delta === 0) return;
        this.maxHealth = Math.max(1, this.maxHealth + delta);
        this.current = Math.min(this.current, this.maxHealth);
    }

    takeDamage(amount: number): void {
        if (this.dead) return;
        const dealt = Math.min(amount, this.current);
        this.current -= dealt;
        this.onDamage?.(dealt);
        if (this.current <= 0) {
            this.dead = true;
            this.onDeath?.();
        }
    }

    heal(amount: number): void {
        if (this.dead) return;
        this.current = Math.min(this.maxHealth, this.current + amount);
    }

    get hp(): number {
        return this.current;
    }
    get maxHp(): number {
        return this.maxHealth;
    }
    get percent(): number {
        return this.current / this.maxHealth;
    }
    get isDead(): boolean {
        return this.dead;
    }
}
