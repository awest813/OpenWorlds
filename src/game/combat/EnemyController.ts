import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { PBRMetallicRoughnessMaterial } from "@babylonjs/core/Materials/PBR/pbrMetallicRoughnessMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { HealthComponent } from "./HealthComponent";

const BASE_COLOR = new Color3(0.8, 0.15, 0.15);
const HIT_COLOR = new Color3(1.0, 0.9, 0.9);
const DEAD_COLOR = new Color3(0.25, 0.25, 0.25);
const HIT_FLASH_DURATION = 0.15;

/**
 * A simple combat dummy enemy.
 * Has health, a hit-flash reaction, and a death-slump state.
 * Duplicate freely in ArenaScene — each instance is independent.
 */
export class EnemyController {
    readonly mesh: AbstractMesh;
    readonly health: HealthComponent;
    readonly displayName: string;

    private hitFlashTimer = 0;
    private readonly mat: PBRMetallicRoughnessMaterial;
    private readonly spawnY: number;

    constructor(scene: Scene, position: Vector3, displayName = "Enemy") {
        this.displayName = displayName;
        this.spawnY = position.y;

        this.mesh = MeshBuilder.CreateCapsule(displayName, { height: 2, radius: 0.4 }, scene);
        this.mesh.position = position.clone();

        this.mat = new PBRMetallicRoughnessMaterial("enemyMat_" + displayName, scene);
        this.mat.baseColor = BASE_COLOR.clone();
        this.mesh.material = this.mat;

        this.health = new HealthComponent(100);
        this.health.onDamage = () => {
            this.hitFlashTimer = HIT_FLASH_DURATION;
        };
        this.health.onDeath = () => {
            this.onDied();
        };
    }

    takeHit(damage: number): void {
        this.health.takeDamage(damage);
    }

    isAlive(): boolean {
        return !this.health.isDead;
    }

    update(deltaSeconds: number): void {
        if (this.health.isDead) return;

        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer = Math.max(0, this.hitFlashTimer - deltaSeconds);
            const t = this.hitFlashTimer / HIT_FLASH_DURATION;
            this.mat.baseColor = Color3.Lerp(BASE_COLOR, HIT_COLOR, t);
        }
    }

    private onDied(): void {
        // Squash the capsule into a "fallen" silhouette
        this.mesh.scaling.y = 0.25;
        this.mesh.position.y = this.spawnY - 0.35;
        this.mat.baseColor = DEAD_COLOR.clone();
    }

    dispose(): void {
        this.mesh.dispose();
    }
}
