import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { PBRMetallicRoughnessMaterial } from "@babylonjs/core/Materials/PBR/pbrMetallicRoughnessMaterial";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { ReflectionProbe } from "@babylonjs/core/Probes/reflectionProbe";
import { SkyMaterial } from "@babylonjs/materials";

import "@babylonjs/core/Animations/animatable";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";

import {
    applyStylizedSceneAtmosphere,
    attachStylizedRenderingPipeline,
    bindOutdoorEnvironment,
    createCobbleMaterial,
    createGrassTerrainMaterial,
    createRockyTerrainMaterial,
    createWeatheredStoneMaterial,
    createWoodPlankMaterial,
} from "../rendering/StylizedLook";

import { InputManager } from "../game/input/InputManager";
import { PlayerController } from "../game/player/PlayerController";
import {
    EnemyController,
    ARCHETYPE_MELEE_CHASER,
    ARCHETYPE_HEAVY_BRUISER,
} from "../game/combat/EnemyController";
import { TargetSystem } from "../game/combat/TargetSystem";
import { CombatController } from "../game/combat/CombatController";
import { CombatHUD } from "../game/ui/CombatHUD";
import { EncounterManager } from "../game/encounter/EncounterManager";
import { WorldState } from "../game/world/WorldState";
import { QuestManager } from "../game/quest/QuestManager";
import { QUEST_BITTERLEAF_FOR_MAREN, QUEST_CLEAR_SCOUTS, QuestState } from "../game/quest/QuestData";
import { NpcController } from "../game/npc/NpcController";
import { InteractionSystem } from "../game/interaction/InteractionSystem";
import { DialogueSystem, DialogueLine } from "../game/dialogue/DialogueSystem";
import { QuestHUD } from "../game/ui/QuestHUD";
import { GatherableManager } from "../game/world/GatherableManager";
import { PlayerProgression } from "../game/progression/PlayerProgression";
import { PlayerBuild } from "../game/progression/PlayerBuild";
import { LOOT_TABLE_SCOUT_ENCOUNTER } from "../game/loot/LootTables";

export interface HubSceneContext {
    player: PlayerController;
    enemies: EnemyController[];
    npcs: NpcController[];
    targetSystem: TargetSystem;
    combatController: CombatController;
    combatHud: CombatHUD;
    questHud: QuestHUD;
    dialogueSystem: DialogueSystem;
    questManager: QuestManager;
    worldState: WorldState;
    interactionSystem: InteractionSystem;
    gatherableManager: GatherableManager;
    playerProgression: PlayerProgression;
    playerBuild: PlayerBuild;
    shadowGenerator: ShadowGenerator;
    encounterManager: EncounterManager;
    /** Call when the player interacts with an NPC; handles dialogue routing. */
    handleInteraction: (npc: NpcController) => void;
}

/**
 * Thornwall Outpost — the first hub area and quest slice.
 *
 * Layout (top = north / +Z):
 *
 *   z > 20 : Combat zone  — three bandit scouts patrol here.
 *   z 0-20 : Gate / path  — connects hub to combat zone.
 *   z -20-0: Hub safe zone — NPC, campfire, walls.
 *
 * Quest flow:
 *   1. Player spawns south of hub, walks to Elder Maren.
 *   2. Dialogue → accept "Drive Out the Scouts".
 *   3. Walk north through the gate, defeat 3 scouts.
 *   4. Return to Elder Maren, turn in quest, receive reward (XP + optional level-up).
 *   5. Elder offers "Bitterleaf for the Kettle" — gather three plants by the south wall, return to turn in.
 */
export async function createHubScene(scene: Scene, input: InputManager): Promise<HubSceneContext> {
    // ── World state + quest ────────────────────────────────────────────────
    const worldState = new WorldState();
    const questManager = new QuestManager();
    questManager.register(QUEST_CLEAR_SCOUTS);
    questManager.register(QUEST_BITTERLEAF_FOR_MAREN);

    applyStylizedSceneAtmosphere(scene);

    // ── Lighting ───────────────────────────────────────────────────────────
    const sun = new DirectionalLight("sun", new Vector3(-4.2, -9, 3.8).normalize(), scene);
    sun.position = sun.direction.negate().scaleInPlace(85);
    sun.diffuse = new Color3(1.0, 0.94, 0.82);
    sun.intensity = 1.35;

    const shadowGenerator = new ShadowGenerator(2048, sun);
    shadowGenerator.usePercentageCloserFiltering = true;
    shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_HIGH;
    shadowGenerator.bias = 0.0008;
    shadowGenerator.normalBias = 0.02;
    shadowGenerator.darkness = 0.35;

    const hemi = new HemisphericLight("hemi", Vector3.Up(), scene);
    hemi.diffuse = new Color3(0.55, 0.62, 0.85);
    hemi.groundColor = new Color3(0.22, 0.2, 0.18);
    hemi.intensity = 0.52;

    // ── Sky ────────────────────────────────────────────────────────────────
    const skyMat = new SkyMaterial("skyMat", scene);
    skyMat.backFaceCulling = false;
    skyMat.useSunPosition = true;
    skyMat.sunPosition = sun.direction.negate();
    skyMat.luminance = 0.85;
    skyMat.turbidity = 4;
    skyMat.rayleigh = 1.35;
    skyMat.mieCoefficient = 0.0045;
    skyMat.mieDirectionalG = 0.75;

    const skybox = MeshBuilder.CreateBox("skyBox", { size: 500 }, scene);
    skybox.material = skyMat;

    const rp = new ReflectionProbe("envProbe", 512, scene);
    rp.renderList?.push(skybox);
    scene.environmentTexture = rp.cubeTexture;

    // ── Ground ─────────────────────────────────────────────────────────────
    // Main physics ground (invisible base) — distant wild soil
    const groundPhysMat = createRockyTerrainMaterial("groundPhysMat", scene, {
        uScale: 28,
        vScale: 28,
        baseTint: new Color3(0.62, 0.58, 0.52),
    });
    bindOutdoorEnvironment(groundPhysMat, scene);

    const ground = MeshBuilder.CreateGround("ground", { width: 200, height: 200 }, scene);
    ground.material = groundPhysMat;
    ground.receiveShadows = true;
    new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0 }, scene);

    // Hub area — cobble / worn stone plaza
    const hubGroundMat = createCobbleMaterial("hubGroundMat", scene, {
        uScale: 16,
        vScale: 17,
        baseTint: new Color3(0.78, 0.74, 0.66),
    });
    bindOutdoorEnvironment(hubGroundMat, scene);

    const hubGround = MeshBuilder.CreateGround("hubGround", { width: 40, height: 42 }, scene);
    hubGround.material = hubGroundMat;
    hubGround.position.set(0, 0.01, -1);
    hubGround.receiveShadows = true;

    // Combat zone — grass-tinted broken ground
    const combatGroundMat = createGrassTerrainMaterial("combatGroundMat", scene, {
        uScale: 14,
        vScale: 14,
        baseTint: new Color3(0.45, 0.52, 0.38),
    });
    bindOutdoorEnvironment(combatGroundMat, scene);

    const combatGround = MeshBuilder.CreateGround("combatGround", { width: 60, height: 60 }, scene);
    combatGround.material = combatGroundMat;
    combatGround.position.set(0, 0.01, 40);
    combatGround.receiveShadows = true;

    // ── Hub structures ─────────────────────────────────────────────────────
    buildHubStructure(scene, shadowGenerator);

    await scatterVillageRocks(scene, shadowGenerator);

    // ── Player ─────────────────────────────────────────────────────────────
    const player = await PlayerController.CreateAsync(scene, input);
    player.getTransform().position.set(0, 3, -14);
    shadowGenerator.addShadowCaster(player.model);

    attachStylizedRenderingPipeline(scene, player.camera.camera);

    const playerProgression = new PlayerProgression(player.health);
    const playerBuild = new PlayerBuild(player.health, playerProgression);

    // ── Enemies (combat zone) ──────────────────────────────────────────────
    const enemies: EnemyController[] = [
        new EnemyController(scene, new Vector3(-6, 1, 28), ARCHETYPE_MELEE_CHASER, player.getTransform(), player.health),
        new EnemyController(scene, new Vector3(6, 1, 32), ARCHETYPE_MELEE_CHASER, player.getTransform(), player.health),
        new EnemyController(scene, new Vector3(0, 1, 40), ARCHETYPE_HEAVY_BRUISER, player.getTransform(), player.health),
    ];
    enemies.forEach((e) => shadowGenerator.addShadowCaster(e.mesh));

    // Bind per-kill quest tracking
    enemies.forEach((e) => {
        e.onKilled = () => {
            questManager.recordKill(QUEST_CLEAR_SCOUTS.id);
        };
    });

    // ── Target system ──────────────────────────────────────────────────────
    const targetSystem = new TargetSystem(scene, player.getTransform());
    enemies.forEach((e) => targetSystem.register(e));

    // ── Combat controller ──────────────────────────────────────────────────
    const combatController = new CombatController(
        player.getTransform(),
        player.physicsAggregate,
        input,
        targetSystem,
        playerBuild
    );
    player.combatController = combatController;

    // ── Encounter manager ──────────────────────────────────────────────────
    const encounterManager = new EncounterManager(enemies, {
        xp: 150,
        lootTableId: LOOT_TABLE_SCOUT_ENCOUNTER.id,
        lootPickCount: 2,
    });

    const gatherableManager = new GatherableManager();
    gatherableManager.canGatherQuest = (id) => questManager.getState(id) === QuestState.Active;
    buildBitterleafPatches(scene, shadowGenerator, gatherableManager);

    // ── NPC: Elder Maren ───────────────────────────────────────────────────
    const elderMaren = new NpcController(scene, {
        name: "Elder Maren",
        position: new Vector3(4, 0, 1),
        interactRange: 3.5,
        bodyColor: new Color3(0.58, 0.48, 0.36),
    });
    shadowGenerator.addShadowCaster(elderMaren.mesh);

    const npcs: NpcController[] = [elderMaren];

    // ── Interaction system ─────────────────────────────────────────────────
    const interactionSystem = new InteractionSystem();
    npcs.forEach((n) => interactionSystem.register(n));

    // ── UI ─────────────────────────────────────────────────────────────────
    const dialogueSystem = new DialogueSystem();
    const questHud = new QuestHUD();
    const combatHud = new CombatHUD();

    encounterManager.onClear = (reward, loot) => {
        playerProgression.gainXp(reward.xp, (newLevel) => {
            playerBuild.onLevelUp();
            questHud.showNotification(`LEVEL UP!\nYou are now level ${newLevel}.`, 3.5);
        });
        if (loot && loot.drops.length > 0) {
            const lines = playerBuild.applyLootDrops(loot.drops);
            questHud.showNotification(`Loot:\n${lines.join("\n")}`, 4.5);
        }
    };

    // ── Dialogue / quest wiring ────────────────────────────────────────────

    /** Build Elder Maren's dialogue lines for the current quest state. */
    function getElderLines(): DialogueLine[] {
        const scoutState = questManager.getState(QUEST_CLEAR_SCOUTS.id);

        if (scoutState !== QuestState.Completed) {
            switch (scoutState) {
                case QuestState.NotStarted:
                    return [
                        {
                            speaker: "Elder Maren",
                            text: "Traveler! I've been praying someone capable would pass through Thornwall.",
                        },
                        {
                            speaker: "Elder Maren",
                            text: "Bandit scouts are circling our outpost — three of them, armed and dangerous.",
                        },
                        {
                            speaker: "Elder Maren",
                            text: "Would you drive them off? Head north through the gate.",
                            choices: [
                                {
                                    label: "I'll handle it.",
                                    onSelect: () => {
                                        questManager.acceptQuest(QUEST_CLEAR_SCOUTS.id);
                                        worldState.setFlag("elder_quest_accepted", true);
                                        questHud.showNotification("New Quest:\nDrive Out the Scouts", 3.0);
                                    },
                                },
                                {
                                    label: "Not now.",
                                    onSelect: () => {
                                        /* player declined */
                                    },
                                },
                            ],
                        },
                    ];

                case QuestState.Active: {
                    const progress = questManager.getProgress(QUEST_CLEAR_SCOUTS.id);
                    const remaining = QUEST_CLEAR_SCOUTS.objective.required - progress;
                    return [
                        {
                            speaker: "Elder Maren",
                            text: `Please hurry — ${remaining} scout${pluralS(remaining)} still threaten us. Head north through the gate.`,
                        },
                    ];
                }

                case QuestState.Completable:
                    return [
                        {
                            speaker: "Elder Maren",
                            text: "You've done it! The scouts are gone — we can finally breathe again.",
                        },
                        {
                            speaker: "Elder Maren",
                            text: "Take this as our thanks. You have the gratitude of Thornwall.",
                            choices: [
                                {
                                    label: "You're welcome.",
                                    onSelect: () => {
                                        const reward = questManager.completeQuest(QUEST_CLEAR_SCOUTS.id);
                                        if (reward) {
                                            playerProgression.gainXp(reward.xp, (newLevel) => {
                                                playerBuild.onLevelUp();
                                                questHud.showNotification(
                                                    `LEVEL UP!\nYou are now level ${newLevel}.`,
                                                    3.5
                                                );
                                            });
                                            if (reward.healAmount) {
                                                player.health.heal(reward.healAmount);
                                            }
                                            worldState.setFlag("quest_clear_scouts_done", true);
                                            questHud.showNotification(
                                                `✓  QUEST COMPLETE\nDrive Out the Scouts\n+${reward.xp} XP${reward.goldText ? "  ·  " + reward.goldText : ""}`,
                                                5.0
                                            );
                                        }
                                    },
                                },
                            ],
                        },
                    ];

                default:
                    return [{ speaker: "Elder Maren", text: "..." }];
            }
        }

        const bitterState = questManager.getState(QUEST_BITTERLEAF_FOR_MAREN.id);

        if (bitterState === QuestState.NotStarted) {
            if (worldState.getFlag("bitterleaf_declined")) {
                return [
                    {
                        speaker: "Elder Maren",
                        text: "Changed your mind? The bitterleaf still grows by the south wall — looks like weeds, tastes like punishment.",
                        choices: [
                            {
                                label: "Fine, I'll pick it.",
                                onSelect: () => {
                                    questManager.acceptQuest(QUEST_BITTERLEAF_FOR_MAREN.id);
                                    worldState.setFlag("bitterleaf_declined", false);
                                    questHud.showNotification("New Quest:\nBitterleaf for the Kettle", 3.0);
                                },
                            },
                            {
                                label: "Still no.",
                                onSelect: () => {
                                    /* declined again */
                                },
                            },
                        ],
                    },
                ];
            }
            return [
                {
                    speaker: "Elder Maren",
                    text: "Ha! While you were up north I remembered something embarrassing: we're out of bitterleaf.",
                },
                {
                    speaker: "Elder Maren",
                    text: "The stew won't fix a spear wound, but the morale tax is real. Three sprigs by the south wall — if the physics gods allow.",
                    choices: [
                        {
                            label: "I'll scrape some up.",
                            onSelect: () => {
                                questManager.acceptQuest(QUEST_BITTERLEAF_FOR_MAREN.id);
                                questHud.showNotification("New Quest:\nBitterleaf for the Kettle", 3.0);
                            },
                        },
                        {
                            label: "That's… not my problem.",
                            onSelect: () => {
                                worldState.setFlag("bitterleaf_declined", true);
                            },
                        },
                    ],
                },
            ];
        }

        if (bitterState === QuestState.Active) {
            const p = questManager.getProgress(QUEST_BITTERLEAF_FOR_MAREN.id);
            const need = QUEST_BITTERLEAF_FOR_MAREN.objective.required - p;
            return [
                {
                    speaker: "Elder Maren",
                    text: `Three sprigs, traveler. You have ${p} — only ${need} more. Try not to clip through the geometry; the last hero did and we pretended not to notice.`,
                },
            ];
        }

        if (bitterState === QuestState.Completable) {
            return [
                {
                    speaker: "Elder Maren",
                    text: "Ah — that reeks correctly. The kettle thanks you, probably.",
                },
                {
                    speaker: "Elder Maren",
                    text: "Here's what passes for payment around here.",
                    choices: [
                        {
                            label: "Keep the stew.",
                            onSelect: () => {
                                const reward = questManager.completeQuest(QUEST_BITTERLEAF_FOR_MAREN.id);
                                if (reward) {
                                    playerProgression.gainXp(reward.xp, (newLevel) => {
                                        playerBuild.onLevelUp();
                                        questHud.showNotification(
                                            `LEVEL UP!\nYou are now level ${newLevel}.`,
                                            3.5
                                        );
                                    });
                                    if (reward.healAmount) {
                                        player.health.heal(reward.healAmount);
                                    }
                                    questHud.showNotification(
                                        `✓  QUEST COMPLETE\nBitterleaf for the Kettle\n+${reward.xp} XP${reward.goldText ? "  ·  " + reward.goldText : ""}`,
                                        5.0
                                    );
                                }
                            },
                        },
                    ],
                },
            ];
        }

        return [
            {
                speaker: "Elder Maren",
                text: "The outpost endures — janky, proud, and slightly over-leveled. Come back if fate invents another errand.",
            },
        ];
    }

    function handleInteraction(npc: NpcController): void {
        if (npc !== elderMaren) return;
        dialogueSystem.show(getElderLines());
    }

    return {
        player,
        enemies,
        npcs,
        targetSystem,
        combatController,
        combatHud,
        questHud,
        dialogueSystem,
        questManager,
        worldState,
        interactionSystem,
        gatherableManager,
        playerProgression,
        playerBuild,
        shadowGenerator,
        encounterManager,
        handleInteraction,
    };
}

// ── Hub structure builder ──────────────────────────────────────────────────

/**
 * Populates the safe hub zone with stone walls, pillars, and a campfire.
 *
 * Hub footprint: roughly x: -18..18, z: -18..18.
 * North wall has an 8-unit gap at x: -4..4 to serve as the gate to the combat zone.
 */
function buildHubStructure(scene: Scene, shadowGenerator: ShadowGenerator): void {
    const wallMat = createWeatheredStoneMaterial("hubWallMat", scene, {
        uScale: 2.8,
        vScale: 2.2,
        baseTint: new Color3(0.68, 0.66, 0.6),
    });
    bindOutdoorEnvironment(wallMat, scene);

    const pillarMat = createWeatheredStoneMaterial("hubPillarMat", scene, {
        uScale: 2.2,
        vScale: 3.2,
        baseTint: new Color3(0.62, 0.6, 0.55),
    });
    bindOutdoorEnvironment(pillarMat, scene);

    // Helper: static physics box
    function staticBox(name: string, w: number, h: number, d: number, x: number, z: number): Mesh {
        const m = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene) as Mesh;
        m.position.set(x, h / 2, z);
        m.material = wallMat;
        m.receiveShadows = true;
        shadowGenerator.addShadowCaster(m);
        new PhysicsAggregate(m, PhysicsShapeType.BOX, { mass: 0 }, scene);
        return m;
    }

    // South wall
    staticBox("wallS", 38, 3, 1, 0, -18);
    // West wall
    staticBox("wallW", 1, 3, 37, -18, 0);
    // East wall
    staticBox("wallE", 1, 3, 37, 18, 0);
    // North wall — west segment (x: -18 to -4)
    staticBox("wallNW", 14, 3, 1, -11, 18);
    // North wall — east segment (x: 4 to 18)
    staticBox("wallNE", 14, 3, 1, 11, 18);

    // Gate posts (mark the passage north)
    function pillar(name: string, x: number, z: number): void {
        const p = MeshBuilder.CreateBox(name, { width: 1.2, height: 4.5, depth: 1.2 }, scene) as Mesh;
        p.position.set(x, 2.25, z);
        p.material = pillarMat;
        p.receiveShadows = true;
        shadowGenerator.addShadowCaster(p);
        new PhysicsAggregate(p, PhysicsShapeType.BOX, { mass: 0 }, scene);
    }

    // Corner pillars
    pillar("pillarNW", -18, 18);
    pillar("pillarNE", 18, 18);
    pillar("pillarSW", -18, -18);
    pillar("pillarSE", 18, -18);
    // Gate pillars
    pillar("pillarGW", -4, 18);
    pillar("pillarGE", 4, 18);

    // ── Campfire (visual only) ─────────────────────────────────────────────
    const logMat = createWoodPlankMaterial("logMat", scene, {
        uScale: 1.4,
        vScale: 1.4,
        baseTint: new Color3(0.38, 0.24, 0.12),
    });
    bindOutdoorEnvironment(logMat, scene);

    const logs = MeshBuilder.CreateCylinder("campfireLogs", { diameter: 0.7, height: 0.22 }, scene) as Mesh;
    logs.position.set(-5, 0.11, -5);
    logs.material = logMat;
    shadowGenerator.addShadowCaster(logs);

    const fireMat = new StandardMaterial("fireMat", scene);
    fireMat.emissiveColor = new Color3(1.0, 0.45, 0.05);
    fireMat.disableLighting = true;

    const fire = MeshBuilder.CreateSphere("campfireFire", { diameter: 0.38 }, scene) as Mesh;
    fire.position.set(-5, 0.38, -5);
    fire.material = fireMat;

    const fireLight = new PointLight("fireLight", new Vector3(-5, 0.6, -5), scene);
    fireLight.diffuse = new Color3(1.0, 0.55, 0.15);
    fireLight.intensity = 1.8;
    fireLight.range = 14;

    // ── Rubble / detail stones near NPC ───────────────────────────────────
    const stoneMat = createRockyTerrainMaterial("stoneMat", scene, {
        uScale: 4,
        vScale: 4,
        baseTint: new Color3(0.52, 0.5, 0.46),
    });
    bindOutdoorEnvironment(stoneMat, scene);

    const stonePositions: [number, number, number, number][] = [
        [-8, 0.2, 2, 0.4],
        [-7, 0.15, 4, 0.3],
        [9, 0.18, -3, 0.35],
    ];
    for (const [sx, sy, sz, ss] of stonePositions) {
        const s = MeshBuilder.CreateBox(`stone_${sx}`, { size: ss }, scene) as Mesh;
        s.position.set(sx, sy, sz);
        s.rotation.y = sx * 1.3;
        s.material = stoneMat;
        s.receiveShadows = true;
        shadowGenerator.addShadowCaster(s);
    }
}

const VILLAGE_ROCK_URL = "https://assets.babylonjs.com/meshes/villagePack/rocks1/rocks1.glb";

/** Decorative rocks from Babylon.js Assets (village pack). */
async function scatterVillageRocks(scene: Scene, shadowGenerator: ShadowGenerator): Promise<void> {
    const result = await SceneLoader.ImportMeshAsync("", "", VILLAGE_ROCK_URL, scene);
    const template = (result.meshes as Mesh[]).find((m) => m.getTotalVertices() > 0);
    if (!template) {
        return;
    }
    template.setEnabled(false);
    template.isVisible = false;

    const placements: [number, number, number, number][] = [
        [-14, 0, 8, 1.15],
        [16, 0, -6, 0.95],
        [-6, 0, -15, 1.0],
        [22, 0, 35, 1.25],
        [-18, 0, 38, 1.05],
        [10, 0, 48, 0.9],
        [-3, 0, 22, 0.75],
    ];

    for (let i = 0; i < placements.length; i++) {
        const [x, y, z, s] = placements[i];
        const rock = template.clone(`scatterRock_${i}`, null);
        if (!rock) continue;
        rock.setEnabled(true);
        rock.isVisible = true;
        rock.position.set(x, y, z);
        rock.rotation.y = (i * 1.7) % (Math.PI * 2);
        rock.scaling.setAll(s);
        rock.receiveShadows = true;
        shadowGenerator.addShadowCaster(rock);
        new PhysicsAggregate(rock, PhysicsShapeType.MESH, { mass: 0 }, scene);
    }
}

/**
 * Decorative bitterleaf clumps south of the hub; walk up and press T while the
 * gather quest is active to credit progress.
 */
function buildBitterleafPatches(
    scene: Scene,
    shadowGenerator: ShadowGenerator,
    gatherableManager: GatherableManager
): void {
    const stemMat = new PBRMetallicRoughnessMaterial("bitterleafStemMat", scene);
    stemMat.baseColor = new Color3(0.22, 0.32, 0.14);
    stemMat.roughness = 0.92;

    const leafMat = new PBRMetallicRoughnessMaterial("bitterleafLeafMat", scene);
    leafMat.baseColor = new Color3(0.35, 0.52, 0.22);
    leafMat.roughness = 0.78;

    const positions: [number, number][] = [
        [-10, -12],
        [2, -14],
        [12, -10],
    ];

    let i = 0;
    for (const [x, z] of positions) {
        const root = MeshBuilder.CreateBox(`bitterleaf_${i}`, { width: 0.01, height: 0.01, depth: 0.01 }, scene) as Mesh;
        root.position.set(x, 0, z);
        root.isPickable = false;

        const stem = MeshBuilder.CreateCylinder(`bitterleafStem_${i}`, { diameter: 0.08, height: 0.35 }, scene) as Mesh;
        stem.parent = root;
        stem.position.y = 0.2;
        stem.material = stemMat;
        stem.receiveShadows = true;
        shadowGenerator.addShadowCaster(stem);

        const leaf = MeshBuilder.CreateSphere(`bitterleafLeaf_${i}`, { diameter: 0.42 }, scene) as Mesh;
        leaf.parent = stem;
        leaf.position.y = 0.28;
        leaf.scaling.set(1.1, 0.45, 0.9);
        leaf.material = leafMat;
        leaf.receiveShadows = true;
        shadowGenerator.addShadowCaster(leaf);

        gatherableManager.register({
            mesh: root,
            questId: QUEST_BITTERLEAF_FOR_MAREN.id,
            pickupRange: 2.8,
            prompt: "Gather bitterleaf",
        });
        i++;
    }
}

/** Returns an "s" suffix when count !== 1. */
function pluralS(count: number): string {
    return count !== 1 ? "s" : "";
}
