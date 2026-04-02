import { describe, expect, it } from "vitest";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import type { EnemyController } from "./EnemyController";
import { findNearestEnemyInForwardCone } from "./targetingHelpers";

function mockEnemy(pos: Vector3, alive = true): EnemyController {
    return {
        isAlive: () => alive,
        mesh: { getAbsolutePosition: () => pos.clone() },
    } as unknown as EnemyController;
}

describe("findNearestEnemyInForwardCone", () => {
    const origin = new Vector3(0, 0, 0);
    const forward = new Vector3(0, 0, -1);
    const fovHalf = 60;

    it("returns null when there are no enemies", () => {
        expect(findNearestEnemyInForwardCone([], origin, forward, 10, fovHalf)).toBeNull();
    });

    it("ignores dead enemies", () => {
        const dead = mockEnemy(new Vector3(0, 0, -2), false);
        expect(findNearestEnemyInForwardCone([dead], origin, forward, 10, fovHalf)).toBeNull();
    });

    it("picks the nearest living enemy inside the cone and range", () => {
        const a = mockEnemy(new Vector3(0, 0, -2));
        const b = mockEnemy(new Vector3(0, 0, -4));
        expect(findNearestEnemyInForwardCone([b, a], origin, forward, 10, fovHalf)).toBe(a);
    });

    it("excludes enemies outside the forward cone", () => {
        const behind = mockEnemy(new Vector3(0, 0, 3));
        expect(findNearestEnemyInForwardCone([behind], origin, forward, 10, fovHalf)).toBeNull();
    });

    it("excludes enemies beyond max range", () => {
        const far = mockEnemy(new Vector3(0, 0, -20));
        expect(findNearestEnemyInForwardCone([far], origin, forward, 5, fovHalf)).toBeNull();
    });
});
