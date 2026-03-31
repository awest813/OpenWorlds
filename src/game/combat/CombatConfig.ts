/**
 * Centralised timing and balance constants for the combat prototype.
 * Tweak values here to tune feel without touching logic.
 */
export const COMBAT_CONFIG = {
    // ── 3-hit ground combo ────────────────────────────────────────────────
    /** Seconds from attack-start during which damage lands. */
    COMBO_HIT_WINDOW: 0.15,
    /** Seconds of movement-lockout after each hit (animation commitment). */
    COMBO_LOCKOUT_DURATION: 0.30,
    /** Window after lockout where pressing attack chains the next hit. */
    COMBO_CHAIN_WINDOW: 0.45,
    /** Total hits in one full combo string. */
    COMBO_COUNT: 3,
    /** Damage per combo hit (indices 0-2). */
    ATTACK_DAMAGE: [12, 12, 22] as const,
    /** Melee hit-check radius in metres. */
    ATTACK_RANGE: 2.5,
    /** Forward lunge speed (m/s) applied each frame during hit window. */
    ATTACK_LUNGE_SPEED: 4.5,

    // ── Dodge roll ─────────────────────────────────────────────────────────
    DODGE_DURATION: 0.38,
    /** Speed (m/s) applied each frame of the dodge. */
    DODGE_SPEED: 8.0,
    /** Invulnerability window inside the dodge duration. */
    DODGE_IFRAME_DURATION: 0.25,
    /** Cooldown before the player can dodge again. */
    DODGE_COOLDOWN: 0.9,

    // ── Dash Strike ability ────────────────────────────────────────────────
    ABILITY_DASH_STRIKE_RANGE: 6.0,
    ABILITY_DASH_STRIKE_DAMAGE: 32,
    ABILITY_DASH_STRIKE_COOLDOWN: 5.0,
    ABILITY_DASH_STRIKE_DURATION: 0.35,
    /** Lunge speed (m/s) during the dash-strike. */
    ABILITY_DASH_STRIKE_LUNGE_SPEED: 14.0,

    // ── Soft-lock targeting ────────────────────────────────────────────────
    /** Maximum targeting range in metres. */
    TARGET_RANGE: 15.0,
    /** Half-angle (degrees) of the forward targeting cone. 60° → 120° total FOV. */
    TARGET_FOV_HALF_ANGLE_DEG: 60,
} as const;
