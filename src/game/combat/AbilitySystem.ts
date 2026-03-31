import { COMBAT_CONFIG } from "./CombatConfig";

/** Contract that every ability must satisfy. */
export interface IAbility {
    readonly id: string;
    readonly displayName: string;
    readonly cooldown: number;
    cooldownRemaining: number;
    isReady(): boolean;
    /** Fraction 0-1 of the cooldown consumed (0 = ready, 1 = just used). */
    getCooldownFraction(): number;
    activate(): void;
    update(dt: number): void;
}

/**
 * Starter ability: a short forward dash that deals a burst of damage.
 * Architecture note: additional abilities (AoE, magic burst, etc.) only need
 * to implement IAbility and register themselves with AbilitySystem.
 */
export class DashStrikeAbility implements IAbility {
    readonly id = "dash_strike";
    readonly displayName = "Dash Strike";
    readonly cooldown = COMBAT_CONFIG.ABILITY_DASH_STRIKE_COOLDOWN;
    cooldownRemaining = 0;

    isReady(): boolean {
        return this.cooldownRemaining <= 0;
    }

    getCooldownFraction(): number {
        if (this.cooldown <= 0) return 0;
        return this.cooldownRemaining / this.cooldown;
    }

    activate(): void {
        this.cooldownRemaining = this.cooldown;
    }

    update(dt: number): void {
        if (this.cooldownRemaining > 0) {
            this.cooldownRemaining = Math.max(0, this.cooldownRemaining - dt);
        }
    }
}

/**
 * Second ability: a spinning slash that hits ALL enemies within a radius.
 * Bound to Q. Great for grouped enemies and crowd control.
 */
export class SpinSlashAbility implements IAbility {
    readonly id = "spin_slash";
    readonly displayName = "Spin Slash";
    readonly cooldown = COMBAT_CONFIG.ABILITY_SPIN_SLASH_COOLDOWN;
    cooldownRemaining = 0;

    isReady(): boolean {
        return this.cooldownRemaining <= 0;
    }

    getCooldownFraction(): number {
        if (this.cooldown <= 0) return 0;
        return this.cooldownRemaining / this.cooldown;
    }

    activate(): void {
        this.cooldownRemaining = this.cooldown;
    }

    update(dt: number): void {
        if (this.cooldownRemaining > 0) {
            this.cooldownRemaining = Math.max(0, this.cooldownRemaining - dt);
        }
    }
}
