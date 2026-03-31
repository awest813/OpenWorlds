/**
 * Lightweight health container used by enemies (and later the player).
 * Fires optional callbacks on damage and death so consumers can react
 * without polling.
 */
export class HealthComponent {
    private current: number;
    private readonly max: number;
    private dead = false;

    /** Called with the actual damage amount dealt each time the entity is hit. */
    onDamage: ((amount: number) => void) | null = null;
    /** Called once when health reaches zero. */
    onDeath: (() => void) | null = null;

    constructor(maxHp: number) {
        this.max = maxHp;
        this.current = maxHp;
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
        this.current = Math.min(this.max, this.current + amount);
    }

    get hp(): number {
        return this.current;
    }
    get maxHp(): number {
        return this.max;
    }
    get percent(): number {
        return this.current / this.max;
    }
    get isDead(): boolean {
        return this.dead;
    }
}
