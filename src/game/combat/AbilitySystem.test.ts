import { describe, expect, it } from "vitest";

import { COMBAT_CONFIG } from "./CombatConfig";
import { DashStrikeAbility, SpinSlashAbility } from "./AbilitySystem";

describe("DashStrikeAbility", () => {
    it("starts ready and enters full cooldown on activate", () => {
        const a = new DashStrikeAbility();
        expect(a.isReady()).toBe(true);
        a.activate();
        expect(a.isReady()).toBe(false);
        expect(a.cooldownRemaining).toBe(COMBAT_CONFIG.ABILITY_DASH_STRIKE_COOLDOWN);
    });

    it("ticks cooldown down with update", () => {
        const a = new DashStrikeAbility();
        a.activate();
        a.update(1);
        expect(a.cooldownRemaining).toBe(COMBAT_CONFIG.ABILITY_DASH_STRIKE_COOLDOWN - 1);
    });
});

describe("SpinSlashAbility", () => {
    it("getCooldownFraction reflects remaining time", () => {
        const a = new SpinSlashAbility();
        a.activate();
        const half = COMBAT_CONFIG.ABILITY_SPIN_SLASH_COOLDOWN / 2;
        a.update(half);
        expect(a.getCooldownFraction()).toBeCloseTo(0.5, 5);
    });
});
