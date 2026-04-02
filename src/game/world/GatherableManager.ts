import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

import { InputManager } from "../input/InputManager";

export interface GatherableSpawn {
    /** World-space root mesh (disabled when picked up). */
    mesh: AbstractMesh;
    /** Quest whose gather objective this satisfies. */
    questId: string;
    /** Horizontal distance at which T can collect. */
    pickupRange: number;
    /** Shown in the HUD when in range (NPC prompt takes priority). */
    prompt: string;
    /** Short label for pickup toast (e.g. "Iron ore"). */
    pickupToastLabel: string;
}

export interface GatherPickupResult {
    questId: string;
    pickupToastLabel: string;
}

/**
 * Walk-up collection nodes for gather objectives (herbs, scraps, etc.).
 *
 * Pickup uses the same key as talk; callers should skip pickup when an NPC
 * is in range so dialogue stays predictable.
 */
export class GatherableManager {
    private readonly items: GatherableSpawn[] = [];
    private readonly consumed = new Set<AbstractMesh>();

    /** When set, pickup only succeeds if this returns true for the node's quest id. */
    canGatherQuest: ((questId: string) => boolean) | null = null;

    register(spawn: GatherableSpawn): void {
        this.items.push(spawn);
    }

    /** Nearest available gatherable prompt if in range, for HUD. */
    getPromptInRange(playerPos: Vector3): string | null {
        let best: GatherableSpawn | null = null;
        let bestDist = Infinity;
        for (const g of this.items) {
            if (this.consumed.has(g.mesh)) continue;
            if (this.canGatherQuest !== null && !this.canGatherQuest(g.questId)) continue;
            const p = g.mesh.getAbsolutePosition();
            const dx = p.x - playerPos.x;
            const dz = p.z - playerPos.z;
            const d = Math.sqrt(dx * dx + dz * dz);
            if (d <= g.pickupRange && d < bestDist) {
                bestDist = d;
                best = g;
            }
        }
        return best?.prompt ?? null;
    }

    /**
     * If the player presses interact near an available node, marks it consumed
     * and returns quest credit + toast label. Otherwise null.
     */
    tryPickup(playerPos: Vector3, input: InputManager): GatherPickupResult | null {
        let best: GatherableSpawn | null = null;
        let bestDist = Infinity;
        for (const g of this.items) {
            if (this.consumed.has(g.mesh)) continue;
            const p = g.mesh.getAbsolutePosition();
            const dx = p.x - playerPos.x;
            const dz = p.z - playerPos.z;
            const d = Math.sqrt(dx * dx + dz * dz);
            if (d <= g.pickupRange && d < bestDist) {
                bestDist = d;
                best = g;
            }
        }
        if (best === null || !input.isJustPressed("t")) return null;
        if (this.canGatherQuest !== null && !this.canGatherQuest(best.questId)) return null;
        this.consumed.add(best.mesh);
        best.mesh.setEnabled(false);
        return { questId: best.questId, pickupToastLabel: best.pickupToastLabel };
    }

    dispose(): void {
        this.items.length = 0;
        this.consumed.clear();
    }
}
