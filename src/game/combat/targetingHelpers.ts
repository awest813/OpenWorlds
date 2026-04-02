import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import { EnemyController } from "./EnemyController";

/**
 * Returns the nearest living enemy within `range` that lies inside the forward
 * cone defined by `fovHalfAngleDeg` (half-angle in degrees, same convention as
 * COMBAT_CONFIG.TARGET_FOV_HALF_ANGLE_DEG).
 */
export function findNearestEnemyInForwardCone(
    enemies: readonly EnemyController[],
    from: Vector3,
    forward: Vector3,
    range: number,
    fovHalfAngleDeg: number
): EnemyController | null {
    const cosHalf = Math.cos((fovHalfAngleDeg * Math.PI) / 180);
    let best: EnemyController | null = null;
    let bestDist = Infinity;

    for (const e of enemies) {
        if (!e.isAlive()) continue;
        const toEnemy = e.mesh.getAbsolutePosition().subtract(from);
        const dist = toEnemy.length();
        if (dist > range || dist < 0.001) continue;
        if (Vector3.Dot(toEnemy.normalize(), forward) < cosHalf) continue;
        if (dist < bestDist) {
            bestDist = dist;
            best = e;
        }
    }
    return best;
}
