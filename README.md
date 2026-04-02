# OpenWorlds

![cover image](cover.png)

OpenWorlds is a Babylon.js + TypeScript third-person action RPG prototype.  
It includes real-time combat, enemy archetypes, NPC interactions, dialogue, and a quest loop in a single hub scene.

## Features

- Third-person player controller with camera-relative movement, sprint (Shift) and walk (Ctrl), and optional pointer lock (click the game canvas; Esc to release)
- Action combat with:
  - 3-hit melee combo
  - Dodge roll
  - Dash Strike ability
  - Spin Slash ability
  - Target cycling
- Enemy AI archetypes (melee chaser, heavy bruiser, ranged caster)
- Hub dressing with glTF props from [Babylon.js Assets](https://github.com/BabylonJS/Assets) (barrels, crates, fence, rocks) via the official CDN
- NPC interaction and dialogue system
- Quest state + objective tracking HUD

## Controls

- `W A S D` — Move
- `Shift` (hold) — Sprint
- `Ctrl` (hold) — Walk
- `Mouse` — Camera look
- `J` or `Left Click` — Attack
- `Space` — Dodge
- `E` — Dash Strike
- `Q` — Spin Slash
- `F` or `Tab` — Cycle target
- `T` — Interact / talk
- `Enter` / `Space` / `T` — Advance dialogue
- `I` — Toggle inventory
- `C` — Cycle class
- `K` — Toggle skill tree panel (full list and 1–9 hotkey mapping)
- `1–9` — Unlock next available skill (order matches panel / HUD)
- `P` — Screenshot
- `V` — Toggle physics debug viewer
- `H` — Toggle controls help overlay
- `Esc` — Release mouse after pointer lock (click canvas again to recapture)
- `R` — Quick reset (reload)

## Getting Started

```bash
npm install
```

### Development

```bash
npm run serve
```

### Build

```bash
npm run build:dev
npm run build
```

### Lint & Format

```bash
npm run lint:check
npm run lint:fix
npm run format
```

## Related Babylon.js RPGs

Curated pointers if you want a different starting point or reference implementation:

| Focus | Repo | Notes |
| --- | --- | --- |
| **Direct ARPG-style** | [**hdevx/3D-Action-RPG-JavaScript**](https://github.com/hdevx/3D-Action-RPG-JavaScript) | “Action RPG Example for Babylon.js”: movement, physics, terrain, scene loading, animation, scene manager, browser demo. Vanilla JS (no bundler), **scene manager**, terrain/animation examples, **in-game level builder**. [Hosted demo](https://www.rpgskilltreegenerator.com/RPG/index.html?scene=outdoor) — try `?scene=inn`, `?scene=outdoor`, `?scene=builder`; add `&debug=true` for the scene inspector. |
| **Third-person starter** | [**BarthPaleologue/ThirdPersonTemplate**](https://github.com/BarthPaleologue/ThirdPersonTemplate) | Not a full RPG; solid base for your own combat, quests, loot, and UI. Third-person controller, physics, Babylon.js project setup. |
| **Multiplayer ARPG-ish** | [**orion3dgames/t5c**](https://github.com/orion3dgames/t5c) | Multiplayer top-down RPG with Babylon.js and Colyseus: click-to-move, client prediction / server reconciliation, map changes, animated characters, chat, navmesh collision. Strong if you want Diablo / PSO-lite style online. |
| **Official game code** | [**BabylonJS/SpacePirates**](https://github.com/BabylonJS/SpacePirates) | Playable official demo game: assets, build steps, useful for scene organization and production-ish patterns (not a full action RPG). |
| **Official tutorial game** | [**BabylonJS/SummerFestival**](https://github.com/BabylonJS/SummerFestival) | Tutorial-oriented repo with assets and material; movement and dash controls; art/music licensing notes help if you learn or remix carefully. |
| **More discovery** | [**Symbitic/awesome-babylonjs**](https://github.com/Symbitic/awesome-babylonjs) | Curated list: demos, games, projects, examples — good once you know third-person melee vs top-down click-to-move vs multiplayer. |

**Rough picks by goal:** single-player Fable / Dark Cloud / Kingdom Hearts–lite prototype → start from **ThirdPersonTemplate**. A more ready-made ARPG example → fork **3D-Action-RPG-JavaScript** first. Online / lobby / zone-based action RPG → study or fork **t5c**.

## Tech Stack

- Babylon.js + Havok physics
- TypeScript
- Webpack
- ESLint + Prettier
