import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import { NpcController } from "../npc/NpcController";
import { InputManager } from "../input/InputManager";

/**
 * Detects when the player is near an interactable NPC and handles the
 * "Talk" input (T key).
 *
 * Separate proximity tracking from input consumption so the HUD can
 * show the prompt at any time while checkInteract() is only called when
 * the dialogue system is not already open.
 */
export class InteractionSystem {
    private readonly npcs: NpcController[] = [];
    private nearbyNpc: NpcController | null = null;

    register(npc: NpcController): void {
        this.npcs.push(npc);
    }

    /**
     * Refresh the nearest in-range NPC reference.
     * Call every frame, even while dialogue is active.
     */
    updateProximity(playerPos: Vector3): void {
        this.nearbyNpc = null;
        let bestDist = Infinity;
        for (const npc of this.npcs) {
            if (npc.isPlayerInRange(playerPos)) {
                const a = npc.mesh.getAbsolutePosition();
                const d = Math.sqrt(
                    (a.x - playerPos.x) ** 2 + (a.z - playerPos.z) ** 2
                );
                if (d < bestDist) {
                    bestDist = d;
                    this.nearbyNpc = npc;
                }
            }
        }
    }

    /**
     * Returns the NPC being interacted with if T was pressed while in range.
     * Call only when dialogue is not already active so the input is not consumed twice.
     */
    checkInteract(input: InputManager): NpcController | null {
        if (this.nearbyNpc !== null && input.isJustPressed("t")) {
            return this.nearbyNpc;
        }
        return null;
    }

    /** The NPC currently within interaction range, or null. Used by HUD for prompts. */
    getNearbyNpc(): NpcController | null {
        return this.nearbyNpc;
    }
}
