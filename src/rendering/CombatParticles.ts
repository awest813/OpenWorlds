import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

const FLARE_TEX = "https://assets.babylonjs.com/textures/flare.png";

/**
 * Spawns a brief burst of melee-impact sparks at the given world position.
 * The particle system disposes itself after the burst completes.
 */
export function spawnHitSparks(scene: Scene, position: Vector3): void {
    const sparks = new ParticleSystem("hitSparks", 40, scene);
    sparks.particleTexture = new Texture(FLARE_TEX, scene);
    sparks.emitter = position.clone();
    sparks.minEmitBox = Vector3.Zero();
    sparks.maxEmitBox = Vector3.Zero();

    sparks.color1 = new Color4(1.0, 0.82, 0.25, 1.0);
    sparks.color2 = new Color4(1.0, 0.42, 0.08, 1.0);
    sparks.colorDead = new Color4(0.35, 0.08, 0.0, 0.0);

    sparks.minSize = 0.05;
    sparks.maxSize = 0.2;
    sparks.minLifeTime = 0.15;
    sparks.maxLifeTime = 0.45;

    sparks.manualEmitCount = 30;
    sparks.emitRate = 200;
    sparks.blendMode = ParticleSystem.BLENDMODE_ADD;

    sparks.gravity = new Vector3(0, -9, 0);
    sparks.direction1 = new Vector3(-5, 3, -5);
    sparks.direction2 = new Vector3(5, 8, 5);
    sparks.minEmitPower = 2.5;
    sparks.maxEmitPower = 5.0;
    sparks.updateSpeed = 0.016;

    // Self-clean after the burst expires.
    sparks.targetStopDuration = 0.12;
    sparks.disposeOnStop = true;
    sparks.start();
}

/**
 * Creates a continuous particle trail attached to a moving mesh.
 * Returns the ParticleSystem so the caller can stop + dispose it when the
 * projectile is removed.
 */
export function createProjectileTrail(scene: Scene, emitter: AbstractMesh): ParticleSystem {
    const trail = new ParticleSystem("projTrail", 60, scene);
    trail.particleTexture = new Texture(FLARE_TEX, scene);
    trail.emitter = emitter;
    trail.minEmitBox = Vector3.Zero();
    trail.maxEmitBox = Vector3.Zero();

    trail.color1 = new Color4(0.35, 0.65, 1.0, 0.9);
    trail.color2 = new Color4(0.55, 0.85, 1.0, 0.7);
    trail.colorDead = new Color4(0.1, 0.3, 0.8, 0.0);

    trail.minSize = 0.06;
    trail.maxSize = 0.22;
    trail.minLifeTime = 0.08;
    trail.maxLifeTime = 0.22;
    trail.emitRate = 80;
    trail.blendMode = ParticleSystem.BLENDMODE_ADD;

    trail.gravity = Vector3.Zero();
    trail.direction1 = new Vector3(-0.3, -0.3, -0.3);
    trail.direction2 = new Vector3(0.3, 0.3, 0.3);
    trail.minEmitPower = 0.05;
    trail.maxEmitPower = 0.2;
    trail.updateSpeed = 0.016;
    trail.start();
    return trail;
}
