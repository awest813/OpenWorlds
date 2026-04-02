import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

import { EnemyController } from "./EnemyController";
import { COMBAT_CONFIG } from "./CombatConfig";
import { findNearestEnemyInForwardCone } from "./targetingHelpers";

/**
 * Manages soft-lock targeting for the player.
 *
 * Press F to acquire the nearest enemy in front of the player or cycle
 * to the next registered enemy if one is already locked.  The golden
 * torus indicator hovers above the current target and bobs gently so it
 * is always easy to identify.
 */
export class TargetSystem {
    private currentTarget: EnemyController | null = null;
    private readonly enemies: EnemyController[] = [];
    private readonly playerTransform: TransformNode;
    private readonly indicator: AbstractMesh;
    private bobTimer = 0;

    constructor(scene: Scene, playerTransform: TransformNode) {
        this.playerTransform = playerTransform;

        // Golden torus ring that hovers above the current target
        this.indicator = MeshBuilder.CreateTorus(
            "targetRing",
            { diameter: 1.4, thickness: 0.06, tessellation: 32 },
            scene
        );
        const mat = new StandardMaterial("targetRingMat", scene);
        mat.emissiveColor = new Color3(1, 0.85, 0.1);
        mat.disableLighting = true;
        this.indicator.material = mat;
        this.indicator.isPickable = false;
        this.indicator.setEnabled(false);
    }

    register(enemy: EnemyController): void {
        this.enemies.push(enemy);
    }

    unregister(enemy: EnemyController): void {
        const idx = this.enemies.indexOf(enemy);
        if (idx !== -1) this.enemies.splice(idx, 1);
        if (this.currentTarget === enemy) this.currentTarget = null;
    }

    getCurrentTarget(): EnemyController | null {
        return this.currentTarget;
    }

    /** Returns a copy of the full registered enemy list (living and dead). */
    getAllEnemies(): EnemyController[] {
        return this.enemies.slice();
    }

    /**
     * If no target is locked, selects the nearest living enemy inside the
     * forward cone.  If a target is already locked, cycles to the next one.
     */
    acquireOrCycleTarget(): void {
        const alive = this.enemies.filter((e) => e.isAlive());
        if (alive.length === 0) {
            this.currentTarget = null;
            return;
        }

        if (this.currentTarget === null || !this.currentTarget.isAlive()) {
            this.currentTarget = this.findBestTarget(alive);
        } else {
            const idx = alive.indexOf(this.currentTarget);
            this.currentTarget = alive[(idx + 1) % alive.length];
        }
    }

    clearTarget(): void {
        this.currentTarget = null;
    }

    /**
     * Returns the nearest living enemy within `range` metres that lies inside
     * the forward cone defined by COMBAT_CONFIG.TARGET_FOV_HALF_ANGLE_DEG.
     * Used by CombatController for untargeted attacks.
     */
    findNearestInRange(from: Vector3, forward: Vector3, range: number): EnemyController | null {
        return findNearestEnemyInForwardCone(
            this.enemies,
            from,
            forward,
            range,
            COMBAT_CONFIG.TARGET_FOV_HALF_ANGLE_DEG
        );
    }

    update(dt: number): void {
        // Drop the current target automatically if it died
        if (this.currentTarget !== null && !this.currentTarget.isAlive()) {
            this.currentTarget = null;
        }

        // Animate the indicator ring
        if (this.currentTarget !== null) {
            this.bobTimer += dt * 2.5;
            const pos = this.currentTarget.mesh.getAbsolutePosition();
            this.indicator.position.set(pos.x, pos.y + 1.6 + Math.sin(this.bobTimer) * 0.06, pos.z);
            this.indicator.rotation.x = Math.PI / 2; // lay the torus flat
            this.indicator.setEnabled(true);
        } else {
            this.indicator.setEnabled(false);
        }
    }

    dispose(): void {
        this.indicator.dispose();
    }

    private findBestTarget(alive: EnemyController[]): EnemyController | null {
        const playerPos = this.playerTransform.getAbsolutePosition();
        const forward = this.getPlayerForward();
        return this.findNearestInRange(playerPos, forward, COMBAT_CONFIG.TARGET_RANGE) ?? alive[0];
    }

    private getPlayerForward(): Vector3 {
        const wm = this.playerTransform.getWorldMatrix();
        // Player moves in local –Z, so world forward = TransformNormal(0,0,–1, worldMatrix)
        const fwd = Vector3.TransformNormal(new Vector3(0, 0, -1), wm);
        return new Vector3(fwd.x, 0, fwd.z).normalize();
    }
}
