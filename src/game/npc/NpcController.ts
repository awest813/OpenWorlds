import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { PBRMetallicRoughnessMaterial } from "@babylonjs/core/Materials/PBR/pbrMetallicRoughnessMaterial";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";

export interface NpcDefinition {
    name: string;
    position: Vector3;
    interactRange: number;
    bodyColor: Color3;
}

/**
 * A friendly NPC that the player can approach and interact with.
 *
 * Rendered as a coloured capsule body with a small glowing orb overhead
 * that pulses to draw the player's attention before they see the HUD prompt.
 */
export class NpcController {
    readonly mesh: AbstractMesh;
    readonly name: string;
    readonly interactRange: number;

    private readonly orbMesh: Mesh;
    private readonly orbMat: StandardMaterial;
    private orbTimer = 0;

    constructor(scene: Scene, def: NpcDefinition) {
        this.name = def.name;
        this.interactRange = def.interactRange;

        // Body
        const body = MeshBuilder.CreateCapsule(
            `npc_${def.name}`,
            { height: 1.8, radius: 0.3 },
            scene
        ) as Mesh;
        body.position = def.position.clone();
        body.position.y = 0.9;
        body.isPickable = false;

        const bodyMat = new PBRMetallicRoughnessMaterial(`npcMat_${def.name}`, scene);
        bodyMat.baseColor = def.bodyColor;
        bodyMat.roughness = 0.85;
        body.material = bodyMat;

        // Interaction orb (glowing sphere that pulses above the NPC's head)
        const orb = MeshBuilder.CreateSphere(`npcOrb_${def.name}`, { diameter: 0.28 }, scene) as Mesh;
        orb.parent = body;
        orb.position.y = 1.3;
        orb.isPickable = false;

        this.orbMat = new StandardMaterial(`npcOrbMat_${def.name}`, scene);
        this.orbMat.emissiveColor = new Color3(1.0, 0.85, 0.1);
        this.orbMat.disableLighting = true;
        orb.material = this.orbMat;

        this.orbMesh = orb;
        this.mesh = body;
    }

    /** True if the player is within interaction range (horizontal distance only). */
    isPlayerInRange(playerPos: Vector3): boolean {
        const a = this.mesh.getAbsolutePosition();
        const dx = a.x - playerPos.x;
        const dz = a.z - playerPos.z;
        return Math.sqrt(dx * dx + dz * dz) <= this.interactRange;
    }

    /** Gentle pulse animation on the interaction orb. Call once per frame. */
    update(dt: number): void {
        this.orbTimer += dt * 2.5;
        const pulse = 0.75 + Math.sin(this.orbTimer) * 0.25;
        this.orbMat.emissiveColor.set(1.0 * pulse, 0.85 * pulse, 0.1 * pulse);
        this.orbMesh.scaling.setAll(0.9 + Math.sin(this.orbTimer) * 0.1);
    }

    dispose(): void {
        this.mesh.dispose();
    }
}
