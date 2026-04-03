import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";

const FLARE_TEX = "https://assets.babylonjs.com/textures/flare.png";
const SMOKE_TEX = "https://assets.babylonjs.com/textures/smoke_15.png";

/**
 * Attaches three layered particle systems to a campfire position:
 *   1. Core fire — fast, bright, additive
 *   2. Embers    — sparse sparks that drift upward and cool
 *   3. Smoke     — slow gray wisps rising above the flame
 *
 * @returns Dispose callback to clean up all three systems.
 */
export function createCampfireParticles(scene: Scene, position: Vector3): () => void {
    // ── 1. Core fire ──────────────────────────────────────────────────────────
    const fire = new ParticleSystem("campfire_fire", 200, scene);
    fire.particleTexture = new Texture(FLARE_TEX, scene);
    fire.emitter = position.clone();
    fire.minEmitBox = new Vector3(-0.15, 0, -0.15);
    fire.maxEmitBox = new Vector3(0.15, 0, 0.15);

    fire.color1 = new Color4(1.0, 0.55, 0.05, 1.0);
    fire.color2 = new Color4(1.0, 0.22, 0.02, 0.85);
    fire.colorDead = new Color4(0.15, 0.05, 0.0, 0.0);

    fire.minSize = 0.18;
    fire.maxSize = 0.52;
    fire.minScaleX = 0.9;
    fire.maxScaleX = 1.3;
    fire.minScaleY = 1.0;
    fire.maxScaleY = 2.0;

    fire.minLifeTime = 0.35;
    fire.maxLifeTime = 0.75;
    fire.emitRate = 130;
    fire.blendMode = ParticleSystem.BLENDMODE_ADD;

    fire.gravity = new Vector3(0, 1.5, 0);
    fire.direction1 = new Vector3(-0.4, 3.5, -0.4);
    fire.direction2 = new Vector3(0.4, 5.5, 0.4);
    fire.minAngularSpeed = -Math.PI * 0.5;
    fire.maxAngularSpeed = Math.PI * 0.5;
    fire.minEmitPower = 0.5;
    fire.maxEmitPower = 1.1;
    fire.updateSpeed = 0.016;
    fire.start();

    // ── 2. Embers ─────────────────────────────────────────────────────────────
    const embers = new ParticleSystem("campfire_embers", 60, scene);
    embers.particleTexture = new Texture(FLARE_TEX, scene);
    embers.emitter = position.clone();
    embers.minEmitBox = new Vector3(-0.12, 0.05, -0.12);
    embers.maxEmitBox = new Vector3(0.12, 0.05, 0.12);

    embers.color1 = new Color4(1.0, 0.65, 0.1, 1.0);
    embers.color2 = new Color4(1.0, 0.35, 0.02, 1.0);
    embers.colorDead = new Color4(0.25, 0.05, 0.0, 0.0);

    embers.minSize = 0.04;
    embers.maxSize = 0.11;
    embers.minLifeTime = 1.2;
    embers.maxLifeTime = 2.8;
    embers.emitRate = 18;
    embers.blendMode = ParticleSystem.BLENDMODE_ADD;

    embers.gravity = new Vector3(0, -0.15, 0);
    embers.direction1 = new Vector3(-1.8, 5, -1.8);
    embers.direction2 = new Vector3(1.8, 10, 1.8);
    embers.minAngularSpeed = 0;
    embers.maxAngularSpeed = Math.PI;
    embers.minEmitPower = 0.4;
    embers.maxEmitPower = 1.4;
    embers.updateSpeed = 0.016;
    embers.start();

    // ── 3. Smoke ──────────────────────────────────────────────────────────────
    const smoke = new ParticleSystem("campfire_smoke", 50, scene);
    smoke.particleTexture = new Texture(SMOKE_TEX, scene);
    smoke.emitter = position.add(new Vector3(0, 0.5, 0));
    smoke.minEmitBox = new Vector3(-0.08, 0, -0.08);
    smoke.maxEmitBox = new Vector3(0.08, 0, 0.08);

    smoke.color1 = new Color4(0.38, 0.36, 0.34, 0.18);
    smoke.color2 = new Color4(0.28, 0.27, 0.26, 0.1);
    smoke.colorDead = new Color4(0.18, 0.18, 0.18, 0.0);

    smoke.minSize = 0.45;
    smoke.maxSize = 1.4;
    smoke.minLifeTime = 2.5;
    smoke.maxLifeTime = 5.5;
    smoke.emitRate = 12;
    smoke.blendMode = ParticleSystem.BLENDMODE_STANDARD;

    smoke.gravity = new Vector3(0, 0.08, 0);
    smoke.direction1 = new Vector3(-0.4, 3.5, -0.4);
    smoke.direction2 = new Vector3(0.4, 5.5, 0.4);
    smoke.minAngularSpeed = -Math.PI * 0.15;
    smoke.maxAngularSpeed = Math.PI * 0.15;
    smoke.minEmitPower = 0.15;
    smoke.maxEmitPower = 0.45;
    smoke.updateSpeed = 0.016;
    smoke.start();

    return () => {
        fire.dispose();
        embers.dispose();
        smoke.dispose();
    };
}
