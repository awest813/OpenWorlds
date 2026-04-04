/**
 * Centralised timing and balance constants for the combat prototype.
 * Tweak values here to tune feel without touching logic.
 */
export const COMBAT_CONFIG = {
    // ── 3-hit ground combo (KH2-style: light–light–heavy finisher) ─────────
    /** Seconds from attack-start during which damage lands. */
    COMBO_HIT_WINDOW: 0.14,
    /** Seconds of movement-lockout after each hit (animation commitment). */
    COMBO_LOCKOUT_DURATION: 0.26,
    /** Window after lockout where pressing attack chains the next hit. */
    COMBO_CHAIN_WINDOW: 0.52,
    /** Extra chain time after the finisher so the string feels less punishing. */
    COMBO_CHAIN_WINDOW_AFTER_FINISHER: 0.72,
    /** Total hits in one full combo string. */
    COMBO_COUNT: 3,
    /** Damage per combo hit (indices 0-1 = quick blows, 2 = finisher). */
    ATTACK_DAMAGE: [11, 13, 28] as const,
    /** Melee hit-check radius in metres. */
    ATTACK_RANGE: 2.65,
    /** Forward lunge speed (m/s) applied each frame during hit window. */
    ATTACK_LUNGE_SPEED: 4.8,
    /** Multiplier on lunge speed during the last combo hit only. */
    COMBO_FINISHER_LUNGE_MULT: 1.35,

    // ── Dodge roll ─────────────────────────────────────────────────────────
    DODGE_DURATION: 0.38,
    /** Speed (m/s) applied each frame of the dodge. */
    DODGE_SPEED: 8.0,
    /** Invulnerability window inside the dodge duration. */
    DODGE_IFRAME_DURATION: 0.25,
    /** Cooldown before the player can dodge again. */
    DODGE_COOLDOWN: 0.85,

    // ── Guard / block (FF7 Remake–style committed guard) ───────────────────
    /** Portion of enemy damage that still gets through while blocking. */
    BLOCK_DAMAGE_TAKEN_MULT: 0.32,
    /** Brief post-guard vulnerability so turtling has a cost. */
    BLOCK_END_VULN_DURATION: 0.12,
    /** Damage multiplier right after releasing guard (punish for mistimed blocks). */
    BLOCK_END_DAMAGE_MULT: 1.22,

    // ── Dash Strike ability (E) ────────────────────────────────────────────
    ABILITY_DASH_STRIKE_RANGE: 6.0,
    ABILITY_DASH_STRIKE_DAMAGE: 36,
    ABILITY_DASH_STRIKE_COOLDOWN: 4.5,
    ABILITY_DASH_STRIKE_DURATION: 0.33,
    /** Lunge speed (m/s) during the dash-strike. */
    ABILITY_DASH_STRIKE_LUNGE_SPEED: 15.0,

    // ── Spin Slash ability (Q) ─────────────────────────────────────────────
    /** AoE radius around the player that Spin Slash hits. */
    ABILITY_SPIN_SLASH_RADIUS: 3.6,
    ABILITY_SPIN_SLASH_DAMAGE: 22,
    ABILITY_SPIN_SLASH_COOLDOWN: 7.0,
    ABILITY_SPIN_SLASH_DURATION: 0.38,

    // ── Hit pause ─────────────────────────────────────────────────────────
    /** Seconds to freeze combat logic on a successful hit (game-feel polish). */
    HIT_PAUSE_DURATION: 0.048,
    /** Extra hit-pause on the combo finisher. */
    HIT_PAUSE_FINISHER_EXTRA: 0.022,
    /** Stronger pause on ability hits (ATB-style weight). */
    HIT_PAUSE_ABILITY_EXTRA: 0.018,

    // ── Enemy stagger (break on chunky hits) ──────────────────────────────
    STAGGER_DURATION: 0.55,

    // ── Player ─────────────────────────────────────────────────────────────
    PLAYER_MAX_HP: 100,

    // ── Soft-lock targeting ────────────────────────────────────────────────
    /** Maximum targeting range in metres. */
    TARGET_RANGE: 15.0,
    /** Half-angle (degrees) of the forward targeting cone. 60° → 120° total FOV. */
    TARGET_FOV_HALF_ANGLE_DEG: 60,

    // ── Enemy projectiles ──────────────────────────────────────────────────
    ENEMY_PROJECTILE_HIT_RADIUS: 0.6,
    ENEMY_PROJECTILE_LIFETIME: 4.0,
} as const;
