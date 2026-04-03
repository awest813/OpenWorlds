import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { PBRMetallicRoughnessMaterial } from "@babylonjs/core/Materials/PBR/pbrMetallicRoughnessMaterial";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import { HealthComponent } from "./HealthComponent";
import { Faction } from "./Faction";
import { COMBAT_CONFIG } from "./CombatConfig";
import { spawnHitSparks, createProjectileTrail } from "../../rendering/CombatParticles";

const HIT_COLOR = new Color3(1.0, 0.9, 0.9);
const DEAD_COLOR = new Color3(0.25, 0.25, 0.25);
const HIT_FLASH_DURATION = 0.15;

// ── Enemy AI state ─────────────────────────────────────────────────────────
const enum EnemyAIState {
    Idle,
    Chasing,
    Attacking,
    Retreating,
    Cooldown,
}

// ── Projectile data ────────────────────────────────────────────────────────
interface EnemyProjectile {
    mesh: Mesh;
    trail: ParticleSystem | null;
    direction: Vector3;
    speed: number;
    damage: number;
    lifetime: number;
}

// ── Archetype config ───────────────────────────────────────────────────────

/** Data-driven config object for each enemy type. */
export interface EnemyArchetypeConfig {
    /** Name shown in the HUD target panel. */
    displayName: string;
    maxHp: number;
    moveSpeed: number;
    /** Distance at which the enemy breaks from Idle and starts chasing. */
    aggroRange: number;
    /** Distance at which a melee attack triggers. */
    attackRange: number;
    /** Damage per melee hit (ignored when isRanged = true). */
    attackDamage: number;
    /** Seconds between successive attacks. */
    attackCooldown: number;
    /** Seconds of windup before damage / projectile fires. */
    attackWindup: number;
    /** When true, uses projectiles instead of melee and maintains distance. */
    isRanged: boolean;
    /** Ranged enemy tries to stay at approximately this distance. */
    preferredRange: number;
    projectileSpeed: number;
    projectileDamage: number;
    baseColor: Color3;
    meshHeight: number;
    meshRadius: number;
}

// ── Preset archetypes ──────────────────────────────────────────────────────

/** Fast melee enemy that closes distance and attacks at short range. */
export const ARCHETYPE_MELEE_CHASER: EnemyArchetypeConfig = {
    displayName: "Chaser",
    maxHp: 60,
    moveSpeed: 3.5,
    aggroRange: 18,
    attackRange: 2.2,
    attackDamage: 10,
    attackCooldown: 1.2,
    attackWindup: 0.3,
    isRanged: false,
    preferredRange: 0,
    projectileSpeed: 0,
    projectileDamage: 0,
    baseColor: new Color3(0.62, 0.28, 0.22),
    meshHeight: 1.8,
    meshRadius: 0.35,
};

/** Slow, tanky enemy with a hard-hitting melee strike. */
export const ARCHETYPE_HEAVY_BRUISER: EnemyArchetypeConfig = {
    displayName: "Bruiser",
    maxHp: 140,
    moveSpeed: 2.0,
    aggroRange: 18,
    attackRange: 2.6,
    attackDamage: 25,
    attackCooldown: 2.2,
    attackWindup: 0.6,
    isRanged: false,
    preferredRange: 0,
    projectileSpeed: 0,
    projectileDamage: 0,
    baseColor: new Color3(0.42, 0.32, 0.52),
    meshHeight: 2.4,
    meshRadius: 0.52,
};

/** Keeps distance and fires magic projectiles, forcing target prioritisation. */
export const ARCHETYPE_RANGED_CASTER: EnemyArchetypeConfig = {
    displayName: "Caster",
    maxHp: 50,
    moveSpeed: 2.8,
    aggroRange: 18,
    attackRange: 12.0,
    attackDamage: 0,
    attackCooldown: 2.5,
    attackWindup: 0.5,
    isRanged: true,
    preferredRange: 9.0,
    projectileSpeed: 12.0,
    projectileDamage: 15,
    baseColor: new Color3(0.22, 0.38, 0.62),
    meshHeight: 1.8,
    meshRadius: 0.35,
};

// ── Unique ID counter ──────────────────────────────────────────────────────
let instanceCounter = 0;

// ── EnemyController ────────────────────────────────────────────────────────

/**
 * Manages an enemy's mesh, health, hit feedback, and simple AI behaviour.
 *
 * AI is purely state-based (Idle → Chase → Attack → Cooldown) and driven by
 * distance checks.  Each archetype config tunes the numbers; the logic stays
 * the same.
 *
 * The ranged caster additionally spawns projectile spheres that travel toward
 * the player and deal damage on contact.
 */
export class EnemyController {
    readonly mesh: AbstractMesh;
    readonly health: HealthComponent;
    readonly displayName: string;
    /** Always Enemy — used by targeting and future companion logic. */
    readonly faction = Faction.Enemy;

    /** Optional callback fired once when this enemy is killed. Used by quest systems. */
    onKilled: (() => void) | null = null;

    private hitFlashTimer = 0;
    private readonly mat: PBRMetallicRoughnessMaterial;
    private readonly spawnPos: Vector3;
    private readonly archetype: EnemyArchetypeConfig;
    private readonly scene: Scene;

    // AI
    private aiState: EnemyAIState = EnemyAIState.Idle;
    /** Seconds remaining before the next attack is allowed. */
    private attackCooldownTimer = 0;
    /** Counts down from attackWindup; attack fires when it crosses zero. */
    private attackWindupTimer = 0;
    private hitDealtThisAttack = false;
    private readonly playerTransform: TransformNode;
    private readonly playerHealth: HealthComponent;
    /** When set (e.g. dodge i-frames), enemy damage to the player is suppressed. */
    private readonly isPlayerInvulnerable: (() => boolean) | null;

    // Projectiles (ranged only)
    private readonly projectiles: EnemyProjectile[] = [];

    constructor(
        scene: Scene,
        position: Vector3,
        archetype: EnemyArchetypeConfig,
        playerTransform: TransformNode,
        playerHealth: HealthComponent,
        isPlayerInvulnerable?: () => boolean
    ) {
        this.scene = scene;
        this.archetype = archetype;
        this.displayName = archetype.displayName;
        this.spawnPos = position.clone();
        this.playerTransform = playerTransform;
        this.playerHealth = playerHealth;
        this.isPlayerInvulnerable = isPlayerInvulnerable ?? null;

        const id = ++instanceCounter;
        this.mesh = MeshBuilder.CreateCapsule(
            `${archetype.displayName}_${id}`,
            { height: archetype.meshHeight, radius: archetype.meshRadius },
            scene
        );
        this.mesh.position = position.clone();

        this.mat = new PBRMetallicRoughnessMaterial(`enemyMat_${archetype.displayName}_${id}`, scene);
        this.mat.baseColor = archetype.baseColor.clone();
        this.mat.metallic = 0.06;
        this.mat.roughness = 0.78;
        if (scene.environmentTexture) {
            this.mat.environmentTexture = scene.environmentTexture;
        }
        this.mesh.material = this.mat;

        this.health = new HealthComponent(archetype.maxHp);
        this.health.onDamage = () => {
            this.hitFlashTimer = HIT_FLASH_DURATION;
            const hitPos = this.mesh.getAbsolutePosition().clone();
            hitPos.y += archetype.meshHeight * 0.5;
            spawnHitSparks(scene, hitPos);
        };
        this.health.onDeath = () => {
            this.onDied();
        };

        // Ranged caster: glowing orb above the head for quick visual identification
        if (archetype.isRanged) {
            const orb = MeshBuilder.CreateSphere(`casterOrb_${id}`, { diameter: 0.32 }, scene) as Mesh;
            orb.parent = this.mesh;
            orb.position.y = archetype.meshHeight / 2 + 0.35;
            const orbMat = new StandardMaterial(`orbMat_${id}`, scene);
            orbMat.emissiveColor = new Color3(0.3, 0.6, 1.0);
            orbMat.disableLighting = true;
            orb.material = orbMat;
        }
    }

    takeHit(damage: number): void {
        this.health.takeDamage(damage);
    }

    isAlive(): boolean {
        return !this.health.isDead;
    }

    update(deltaSeconds: number): void {
        if (this.health.isDead) {
            this.updateProjectiles(deltaSeconds);
            return;
        }
        this.updateFlash(deltaSeconds);
        this.updateAI(deltaSeconds);
        this.updateProjectiles(deltaSeconds);
    }

    dispose(): void {
        this.projectiles.forEach((p) => {
            p.trail?.stop();
            p.trail?.dispose();
            p.mesh.dispose();
        });
        this.mesh.dispose();
    }

    // ── Hit flash ────────────────────────────────────────────────────────────

    private updateFlash(dt: number): void {
        if (this.hitFlashTimer <= 0) return;
        this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
        const t = this.hitFlashTimer / HIT_FLASH_DURATION;
        this.mat.baseColor = Color3.Lerp(this.archetype.baseColor, HIT_COLOR, t);
    }

    // ── AI state machine ─────────────────────────────────────────────────────

    private updateAI(dt: number): void {
        if (this.attackCooldownTimer > 0) this.attackCooldownTimer -= dt;

        const playerPos = this.playerTransform.getAbsolutePosition();
        const myPos = this.mesh.getAbsolutePosition();
        const toPlayer = new Vector3(playerPos.x - myPos.x, 0, playerPos.z - myPos.z);
        const dist = toPlayer.length();

        switch (this.aiState) {
            case EnemyAIState.Idle:
                if (dist <= this.archetype.aggroRange) {
                    this.aiState = EnemyAIState.Chasing;
                }
                break;

            case EnemyAIState.Chasing:
                if (this.archetype.isRanged) {
                    this.tickRangedChase(dt, dist, toPlayer);
                } else {
                    this.tickMeleeChase(dt, dist, toPlayer);
                }
                break;

            case EnemyAIState.Attacking:
                this.attackWindupTimer -= dt;
                if (!this.hitDealtThisAttack && this.attackWindupTimer <= 0) {
                    this.executeAttack();
                }
                // Brief recovery window after damage fires before transitioning out
                if (this.attackWindupTimer <= -0.15) {
                    this.aiState = EnemyAIState.Cooldown;
                    this.attackCooldownTimer = this.archetype.attackCooldown;
                }
                break;

            case EnemyAIState.Retreating:
                // Ranged: back away until we reach preferred distance
                if (dist > 0.001) {
                    const awayDir = toPlayer.normalize().negate();
                    this.mesh.position.addInPlace(awayDir.scale(this.archetype.moveSpeed * dt));
                    this.mesh.position.y = this.spawnPos.y;
                }
                if (dist >= this.archetype.preferredRange) {
                    this.aiState = EnemyAIState.Chasing;
                }
                break;

            case EnemyAIState.Cooldown:
                if (this.attackCooldownTimer <= 0) {
                    this.aiState = EnemyAIState.Chasing;
                }
                break;
        }

        // Always face the player while active
        if (this.aiState !== EnemyAIState.Idle && dist > 0.1) {
            const dir = toPlayer.normalize();
            this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
        }
    }

    private tickMeleeChase(dt: number, dist: number, toPlayer: Vector3): void {
        if (dist <= this.archetype.attackRange && this.attackCooldownTimer <= 0) {
            this.aiState = EnemyAIState.Attacking;
            this.attackWindupTimer = this.archetype.attackWindup;
            this.hitDealtThisAttack = false;
        } else if (dist > this.archetype.attackRange) {
            this.stepToward(toPlayer, dt);
        }
    }

    private tickRangedChase(dt: number, dist: number, toPlayer: Vector3): void {
        const minDist = this.archetype.preferredRange * 0.6;
        if (dist < minDist) {
            this.aiState = EnemyAIState.Retreating;
            return;
        }
        if (dist <= this.archetype.attackRange && this.attackCooldownTimer <= 0) {
            this.aiState = EnemyAIState.Attacking;
            this.attackWindupTimer = this.archetype.attackWindup;
            this.hitDealtThisAttack = false;
        } else if (dist > this.archetype.preferredRange * 1.5) {
            this.stepToward(toPlayer, dt);
        }
    }

    private stepToward(toPlayer: Vector3, dt: number): void {
        if (toPlayer.length() < 0.001) return;
        const move = toPlayer.normalize().scale(this.archetype.moveSpeed * dt);
        this.mesh.position.addInPlace(move);
        this.mesh.position.y = this.spawnPos.y;
    }

    // ── Attack execution ──────────────────────────────────────────────────────

    private executeAttack(): void {
        this.hitDealtThisAttack = true;
        if (this.archetype.isRanged) {
            this.fireProjectile();
        } else {
            // Melee: damage if still in range (generous 20% buffer for feel)
            const dist = Vector3.Distance(
                this.mesh.getAbsolutePosition(),
                this.playerTransform.getAbsolutePosition()
            );
            if (dist <= this.archetype.attackRange * 1.2 && !(this.isPlayerInvulnerable?.() ?? false)) {
                this.playerHealth.takeDamage(this.archetype.attackDamage);
            }
        }
    }

    private fireProjectile(): void {
        const from = this.mesh.getAbsolutePosition().clone();
        from.y += this.archetype.meshHeight * 0.5;
        const target = this.playerTransform.getAbsolutePosition().clone();
        target.y += 1.0; // aim at player centre
        const dir = target.subtract(from).normalize();

        const id = ++instanceCounter;
        const projMesh = MeshBuilder.CreateSphere(`proj_${id}`, { diameter: 0.28 }, this.scene) as Mesh;
        projMesh.position = from;
        projMesh.isPickable = false;

        const projMat = new StandardMaterial(`projMat_${id}`, this.scene);
        projMat.emissiveColor = new Color3(0.4, 0.75, 1.0);
        projMat.disableLighting = true;
        projMesh.material = projMat;

        const trail = createProjectileTrail(this.scene, projMesh);

        this.projectiles.push({
            mesh: projMesh,
            trail,
            direction: dir,
            speed: this.archetype.projectileSpeed,
            damage: this.archetype.projectileDamage,
            lifetime: COMBAT_CONFIG.ENEMY_PROJECTILE_LIFETIME,
        });
    }

    // ── Projectile update ─────────────────────────────────────────────────────

    private updateProjectiles(dt: number): void {
        const playerPos = this.playerTransform.getAbsolutePosition();
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.lifetime -= dt;
            p.mesh.position.addInPlace(p.direction.scale(p.speed * dt));

            const dist = Vector3.Distance(p.mesh.position, playerPos);
            const expired = p.lifetime <= 0 || dist <= COMBAT_CONFIG.ENEMY_PROJECTILE_HIT_RADIUS;
            if (expired) {
                if (
                    dist <= COMBAT_CONFIG.ENEMY_PROJECTILE_HIT_RADIUS &&
                    !(this.isPlayerInvulnerable?.() ?? false)
                ) {
                    this.playerHealth.takeDamage(p.damage);
                }
                p.trail?.stop();
                p.trail?.dispose();
                p.mesh.dispose();
                this.projectiles.splice(i, 1);
            }
        }
    }

    // ── Death ─────────────────────────────────────────────────────────────────

    private onDied(): void {
        this.mesh.scaling.y = 0.25;
        this.mesh.position.y = this.spawnPos.y - 0.35;
        this.mesh.rotation.x = Math.PI / 2;
        this.mat.baseColor = DEAD_COLOR.clone();
        // Clean up any in-flight projectiles and trails
        this.projectiles.forEach((p) => {
            p.trail?.stop();
            p.trail?.dispose();
            p.mesh.dispose();
        });
        this.projectiles.length = 0;
        this.onKilled?.();
    }
}

