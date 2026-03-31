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
import { QUEST_CLEAR_SCOUTS, QuestState } from "../game/quest/QuestData";
import { NpcController } from "../game/npc/NpcController";
import { InteractionSystem } from "../game/interaction/InteractionSystem";
import { DialogueSystem, DialogueLine } from "../game/dialogue/DialogueSystem";
import { QuestHUD } from "../game/ui/QuestHUD";

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
 *   4. Return to Elder Maren, turn in quest, receive reward.
 */
export async function createHubScene(scene: Scene, input: InputManager): Promise<HubSceneContext> {
    // ── World state + quest ────────────────────────────────────────────────
    const worldState = new WorldState();
    const questManager = new QuestManager();
    questManager.register(QUEST_CLEAR_SCOUTS);

    // ── Lighting ───────────────────────────────────────────────────────────
    const sun = new DirectionalLight("sun", new Vector3(-5, -10, 5).normalize(), scene);
    sun.position = sun.direction.negate().scaleInPlace(60);
    sun.intensity = 1.0;

    const shadowGenerator = new ShadowGenerator(1024, sun);
    shadowGenerator.useExponentialShadowMap = true;

    const hemi = new HemisphericLight("hemi", Vector3.Up(), scene);
    hemi.intensity = 0.35;

    // ── Sky ────────────────────────────────────────────────────────────────
    const skyMat = new SkyMaterial("skyMat", scene);
    skyMat.backFaceCulling = false;
    skyMat.useSunPosition = true;
    skyMat.sunPosition = sun.direction.negate();

    const skybox = MeshBuilder.CreateBox("skyBox", { size: 500 }, scene);
    skybox.material = skyMat;

    const rp = new ReflectionProbe("envProbe", 512, scene);
    rp.renderList?.push(skybox);
    scene.environmentTexture = rp.cubeTexture;

    // ── Ground ─────────────────────────────────────────────────────────────
    // Main physics ground (invisible base)
    const groundPhysMat = new PBRMetallicRoughnessMaterial("groundPhysMat", scene);
    groundPhysMat.baseColor = new Color3(0.35, 0.32, 0.28);
    groundPhysMat.roughness = 0.95;

    const ground = MeshBuilder.CreateGround("ground", { width: 200, height: 200 }, scene);
    ground.material = groundPhysMat;
    ground.receiveShadows = true;
    new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0 }, scene);

    // Hub area — warmer, paved feel
    const hubGroundMat = new PBRMetallicRoughnessMaterial("hubGroundMat", scene);
    hubGroundMat.baseColor = new Color3(0.56, 0.52, 0.44);
    hubGroundMat.roughness = 0.92;

    const hubGround = MeshBuilder.CreateGround("hubGround", { width: 40, height: 42 }, scene);
    hubGround.material = hubGroundMat;
    hubGround.position.set(0, 0.01, -1);
    hubGround.receiveShadows = true;

    // Combat zone — darker, more foreboding
    const combatGroundMat = new PBRMetallicRoughnessMaterial("combatGroundMat", scene);
    combatGroundMat.baseColor = new Color3(0.28, 0.26, 0.23);
    combatGroundMat.roughness = 0.96;

    const combatGround = MeshBuilder.CreateGround("combatGround", { width: 60, height: 60 }, scene);
    combatGround.material = combatGroundMat;
    combatGround.position.set(0, 0.01, 40);
    combatGround.receiveShadows = true;

    // ── Hub structures ─────────────────────────────────────────────────────
    buildHubStructure(scene, shadowGenerator);

    // ── Player ─────────────────────────────────────────────────────────────
    const player = await PlayerController.CreateAsync(scene, input);
    player.getTransform().position.set(0, 3, -14);
    shadowGenerator.addShadowCaster(player.model);

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
        targetSystem
    );
    player.combatController = combatController;

    // ── Encounter manager ──────────────────────────────────────────────────
    const encounterManager = new EncounterManager(enemies, { xp: 150 });

    // ── NPC: Elder Maren ───────────────────────────────────────────────────
    const elderMaren = new NpcController(scene, {
        name: "Elder Maren",
        position: new Vector3(4, 0, 1),
        interactRange: 3.5,
        bodyColor: new Color3(0.72, 0.62, 0.32),
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

    // ── Dialogue / quest wiring ────────────────────────────────────────────

    /** Build Elder Maren's dialogue lines for the current quest state. */
    function getElderLines(): DialogueLine[] {
        const state = questManager.getState(QUEST_CLEAR_SCOUTS.id);

        switch (state) {
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
                        text: `Please hurry — ${remaining} scout${remaining !== 1 ? "s" : ""} still threaten us. Head north through the gate.`,
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

            case QuestState.Completed:
                return [
                    {
                        speaker: "Elder Maren",
                        text: "Thank you again, brave one. Thornwall stands because of you.",
                    },
                ];

            default:
                return [{ speaker: "Elder Maren", text: "..." }];
        }
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
    const wallMat = new PBRMetallicRoughnessMaterial("hubWallMat", scene);
    wallMat.baseColor = new Color3(0.52, 0.5, 0.46);
    wallMat.roughness = 0.9;

    const pillarMat = new PBRMetallicRoughnessMaterial("hubPillarMat", scene);
    pillarMat.baseColor = new Color3(0.58, 0.55, 0.5);
    pillarMat.roughness = 0.88;

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
    const logMat = new PBRMetallicRoughnessMaterial("logMat", scene);
    logMat.baseColor = new Color3(0.3, 0.18, 0.08);
    logMat.roughness = 0.95;

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
    const stoneMat = new PBRMetallicRoughnessMaterial("stoneMat", scene);
    stoneMat.baseColor = new Color3(0.45, 0.43, 0.4);
    stoneMat.roughness = 0.94;

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
    }
}
