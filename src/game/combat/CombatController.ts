import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";

import { InputManager } from "../input/InputManager";
import { TargetSystem } from "./TargetSystem";
import { DashStrikeAbility } from "./AbilitySystem";
import { EnemyController } from "./EnemyController";
import { COMBAT_CONFIG } from "./CombatConfig";

export enum CombatPhase {
    Idle = "Idle",
    /** Brief window in which the hit-check fires and damage lands. */
    HitWindow = "HitWindow",
    /** Player is committed to the swing; movement suppressed. */
    Lockout = "Lockout",
    /** Combo-chain window; player can move and queue the next hit. */
    ChainWindow = "ChainWindow",
    Dodging = "Dodging",
    UsingAbility = "UsingAbility",
}

/**
 * Drives the player's combat behaviour: 3-hit combo, dodge roll, and the
 * Dash Strike starter ability.
 *
 * The controller takes references to the player's TransformNode and physics
 * body so it can apply lunges and facing snaps without importing
 * PlayerController (avoiding a circular dependency).
 *
 * PlayerController must call isMovementLocked() each frame and suppress its
 * own movement when true.
 */
export class CombatController {
    private phase: CombatPhase = CombatPhase.Idle;
    private phaseTimer = 0;
    /** 0-indexed position in the current combo string (0, 1, 2). */
    private comboStep = 0;
    private hitDealt = false;
    /** Set to true when attack input arrives during the Lockout phase. */
    private chainPressed = false;
    private dodgeCooldown = 0;
    private dodgeDir = Vector3.Zero();

    readonly dashStrike = new DashStrikeAbility();

    private readonly transform: TransformNode;
    private readonly physics: PhysicsAggregate;
    private readonly input: InputManager;
    private readonly targeting: TargetSystem;

    constructor(
        playerTransform: TransformNode,
        playerPhysics: PhysicsAggregate,
        input: InputManager,
        targeting: TargetSystem
    ) {
        this.transform = playerTransform;
        this.physics = playerPhysics;
        this.input = input;
        this.targeting = targeting;
    }

    // ── Public state queries ───────────────────────────────────────────────

    getPhase(): CombatPhase {
        return this.phase;
    }
    /** 0-based index of the current hit in the combo string. */
    getComboStep(): number {
        return this.comboStep;
    }

    /**
     * True when PlayerController should not apply movement input.
     * ChainWindow is intentionally NOT locked so the player can reposition
     * between hits, matching the KH2 feel.
     */
    isMovementLocked(): boolean {
        return (
            this.phase === CombatPhase.HitWindow ||
            this.phase === CombatPhase.Lockout ||
            this.phase === CombatPhase.Dodging ||
            this.phase === CombatPhase.UsingAbility
        );
    }

    // ── Per-frame update ───────────────────────────────────────────────────

    update(dt: number): void {
        this.dashStrike.update(dt);
        if (this.dodgeCooldown > 0) {
            this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);
        }

        // Target acquisition / cycling (F or Tab)
        if (this.input.isJustPressed("f") || this.input.isJustPressed("Tab")) {
            this.targeting.acquireOrCycleTarget();
        }

        switch (this.phase) {
            case CombatPhase.Idle:
                this.tickIdle();
                break;
            case CombatPhase.HitWindow:
                this.tickHitWindow(dt);
                break;
            case CombatPhase.Lockout:
                this.tickLockout(dt);
                break;
            case CombatPhase.ChainWindow:
                this.tickChainWindow(dt);
                break;
            case CombatPhase.Dodging:
                this.tickDodging(dt);
                break;
            case CombatPhase.UsingAbility:
                this.tickAbility(dt);
                break;
        }
    }

    // ── Idle ───────────────────────────────────────────────────────────────

    private tickIdle(): void {
        if (this.input.isJustPressed("j") || this.input.isJustPressed("mouse0")) {
            this.beginAttack();
        } else if (this.input.isJustPressed(" ") && this.dodgeCooldown <= 0) {
            this.beginDodge();
        } else if (this.input.isJustPressed("e") && this.dashStrike.isReady()) {
            this.beginAbility();
        }
    }

    // ── Attack combo ───────────────────────────────────────────────────────

    private beginAttack(): void {
        this.phase = CombatPhase.HitWindow;
        this.phaseTimer = COMBAT_CONFIG.COMBO_HIT_WINDOW;
        this.hitDealt = false;
        this.faceTarget();
    }

    private tickHitWindow(dt: number): void {
        this.phaseTimer -= dt;

        // Apply forward lunge each frame during the hit window
        this.moveDirect(this.getForward(), COMBAT_CONFIG.ATTACK_LUNGE_SPEED, dt);

        if (!this.hitDealt) {
            const hit = this.resolveHit(COMBAT_CONFIG.ATTACK_RANGE);
            if (hit !== null) {
                hit.takeHit(COMBAT_CONFIG.ATTACK_DAMAGE[this.comboStep]);
                this.hitDealt = true;
            }
        }

        if (this.phaseTimer <= 0) {
            this.phase = CombatPhase.Lockout;
            this.phaseTimer = COMBAT_CONFIG.COMBO_LOCKOUT_DURATION;
            this.chainPressed = false;
        }
    }

    private tickLockout(dt: number): void {
        this.phaseTimer -= dt;

        // Buffer the next attack press during lockout
        if (this.input.isJustPressed("j") || this.input.isJustPressed("mouse0")) {
            this.chainPressed = true;
        }

        if (this.phaseTimer <= 0) {
            if (this.chainPressed && this.comboStep < COMBAT_CONFIG.COMBO_COUNT - 1) {
                this.comboStep++;
                this.beginAttack();
            } else {
                this.phase = CombatPhase.ChainWindow;
                this.phaseTimer = COMBAT_CONFIG.COMBO_CHAIN_WINDOW;
            }
        }
    }

    private tickChainWindow(dt: number): void {
        this.phaseTimer -= dt;

        if (
            (this.input.isJustPressed("j") || this.input.isJustPressed("mouse0")) &&
            this.comboStep < COMBAT_CONFIG.COMBO_COUNT - 1
        ) {
            this.comboStep++;
            this.beginAttack();
            return;
        }

        if (this.phaseTimer <= 0) {
            this.comboStep = 0;
            this.phase = CombatPhase.Idle;
        }
    }

    // ── Dodge ──────────────────────────────────────────────────────────────

    private beginDodge(): void {
        this.phase = CombatPhase.Dodging;
        this.phaseTimer = COMBAT_CONFIG.DODGE_DURATION;
        this.dodgeCooldown = COMBAT_CONFIG.DODGE_COOLDOWN;
        // Dash in the player's current facing direction
        this.dodgeDir = this.getForward();
    }

    private tickDodging(dt: number): void {
        this.moveDirect(this.dodgeDir, COMBAT_CONFIG.DODGE_SPEED, dt);
        this.phaseTimer -= dt;
        if (this.phaseTimer <= 0) {
            this.phase = CombatPhase.Idle;
        }
    }

    // ── Dash Strike ability ────────────────────────────────────────────────

    private beginAbility(): void {
        this.phase = CombatPhase.UsingAbility;
        this.phaseTimer = COMBAT_CONFIG.ABILITY_DASH_STRIKE_DURATION;
        this.hitDealt = false;
        this.dashStrike.activate();
        this.faceTarget();
    }

    private tickAbility(dt: number): void {
        this.moveDirect(this.getForward(), COMBAT_CONFIG.ABILITY_DASH_STRIKE_LUNGE_SPEED, dt);
        this.phaseTimer -= dt;

        // Damage lands at the halfway point of the dash
        if (!this.hitDealt && this.phaseTimer <= COMBAT_CONFIG.ABILITY_DASH_STRIKE_DURATION * 0.5) {
            const hit = this.resolveHit(COMBAT_CONFIG.ABILITY_DASH_STRIKE_RANGE);
            if (hit !== null) {
                hit.takeHit(COMBAT_CONFIG.ABILITY_DASH_STRIKE_DAMAGE);
            }
            this.hitDealt = true;
        }

        if (this.phaseTimer <= 0) {
            this.comboStep = 0;
            this.phase = CombatPhase.Idle;
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    /**
     * Finds the enemy that should receive the next hit.
     * Locked target takes priority if it is within range; otherwise falls
     * back to the nearest enemy in front of the player.
     */
    private resolveHit(range: number): EnemyController | null {
        const playerPos = this.transform.getAbsolutePosition();
        const target = this.targeting.getCurrentTarget();
        if (target !== null && target.isAlive()) {
            const dist = Vector3.Distance(playerPos, target.mesh.getAbsolutePosition());
            if (dist <= range) return target;
        }
        // Untargeted: hit nearest valid enemy in front
        return this.targeting.findNearestInRange(playerPos, this.getForward(), range);
    }

    /**
     * Snap the player to face the locked target.
     * Uses the same FromLookDirectionLH convention as PlayerController so
     * that local –Z points toward the target after rotation.
     */
    private faceTarget(): void {
        const target = this.targeting.getCurrentTarget();
        if (target === null) return;

        const myPos = this.transform.getAbsolutePosition();
        const targetPos = target.mesh.getAbsolutePosition();
        const dir = new Vector3(targetPos.x - myPos.x, 0, targetPos.z - myPos.z);
        if (dir.length() < 0.01) return;
        dir.normalize();

        if (this.transform.rotationQuaternion === null) {
            this.transform.rotationQuaternion = Quaternion.Identity();
        }
        Quaternion.FromLookDirectionLHToRef(dir, Vector3.Up(), this.transform.rotationQuaternion);
    }

    /**
     * Move the transform by (direction × speed × dt) and synchronise the
     * Havok physics body so the capsule stays in step with the visual mesh.
     * Mirrors the setTargetTransform pattern used by PlayerController.
     */
    private moveDirect(direction: Vector3, speed: number, dt: number): void {
        this.transform.position.addInPlace(direction.scale(speed * dt));
        const q = this.transform.rotationQuaternion ?? Quaternion.Identity();
        this.physics.body.setTargetTransform(this.transform.position, q);
    }

    /**
     * Returns the player's world-space forward direction.
     * Player moves in local –Z, so forward = TransformNormal(0,0,–1, worldMatrix).
     */
    private getForward(): Vector3 {
        const wm = this.transform.getWorldMatrix();
        const fwd = Vector3.TransformNormal(new Vector3(0, 0, -1), wm);
        return new Vector3(fwd.x, 0, fwd.z).normalize();
    }
}
