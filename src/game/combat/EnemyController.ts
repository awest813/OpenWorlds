import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { PBRMetallicRoughnessMaterial } from "@babylonjs/core/Materials/PBR/pbrMetallicRoughnessMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";

/**
 * Placeholder enemy controller.
 * Provides a visible, targetable mesh in the scene for testing lock-on and hit detection.
 */
export class EnemyController {
    readonly mesh: AbstractMesh;

    constructor(scene: Scene, position: Vector3) {
        this.mesh = MeshBuilder.CreateCapsule("Enemy", { height: 2, radius: 0.4 }, scene);
        this.mesh.position = position;

        const mat = new PBRMetallicRoughnessMaterial("enemyMat", scene);
        mat.baseColor = new Color3(0.8, 0.15, 0.15);
        this.mesh.material = mat;
    }

    update(_deltaSeconds: number): void {
        // TODO: AI state machine, patrol, aggro, attack patterns
    }

    dispose(): void {
        this.mesh.dispose();
    }
}
