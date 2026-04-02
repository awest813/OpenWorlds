import { describe, expect, it, vi } from "vitest";

import { HealthComponent } from "./HealthComponent";

describe("HealthComponent", () => {
    it("takeDamage clamps to current HP and invokes onDamage with dealt amount", () => {
        const h = new HealthComponent(10);
        const onDamage = vi.fn();
        h.onDamage = onDamage;
        h.takeDamage(100);
        expect(h.hp).toBe(0);
        expect(h.isDead).toBe(true);
        expect(onDamage).toHaveBeenCalledWith(10);
    });

    it("takeDamage does nothing when already dead", () => {
        const h = new HealthComponent(5);
        h.takeDamage(5);
        const onDamage = vi.fn();
        h.onDamage = onDamage;
        h.takeDamage(3);
        expect(onDamage).not.toHaveBeenCalled();
    });

    it("heal does not exceed max HP", () => {
        const h = new HealthComponent(10);
        h.takeDamage(3);
        h.heal(100);
        expect(h.hp).toBe(10);
    });
});
