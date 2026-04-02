import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color3 } from "@babylonjs/core/Maths/math";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { PBRMetallicRoughnessMaterial } from "@babylonjs/core/Materials/PBR/pbrMetallicRoughnessMaterial";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { ReflectionProbe } from "@babylonjs/core/Probes/reflectionProbe";
import { SkyMaterial } from "@babylonjs/materials";

import {
    applyStylizedSceneAtmosphere,
    attachStylizedRenderingPipeline,
    bindOutdoorEnvironment,
    createRockyTerrainMaterial,
} from "../rendering/StylizedLook";

import { InputManager } from "../game/input/InputManager";
import { PlayerController } from "../game/player/PlayerController";
import {
    EnemyController,
    ARCHETYPE_MELEE_CHASER,
    ARCHETYPE_HEAVY_BRUISER,
    ARCHETYPE_RANGED_CASTER,
} from "../game/combat/EnemyController";
import { TargetSystem } from "../game/combat/TargetSystem";
import { CombatController } from "../game/combat/CombatController";
import { CombatHUD } from "../game/ui/CombatHUD";
import { EncounterManager } from "../game/encounter/EncounterManager";
import { PlayerProgression } from "../game/progression/PlayerProgression";
import { PlayerBuild } from "../game/progression/PlayerBuild";
import { LOOT_TABLE_ARENA_SPARRING } from "../game/loot/LootTables";

export interface ArenaSceneContext {
    player: PlayerController;
    enemies: EnemyController[];
    targetSystem: TargetSystem;
    combatController: CombatController;
    combatHud: CombatHUD;
    playerProgression: PlayerProgression;
    playerBuild: PlayerBuild;
    shadowGenerator: ShadowGenerator;
    encounterManager: EncounterManager;
}

/** Sets up the test arena: ground, lighting, sky, player, and three enemy archetypes. */
export async function createArenaScene(scene: Scene, input: InputManager): Promise<ArenaSceneContext> {
    applyStylizedSceneAtmosphere(scene);

    // --- Lighting ---
    const sun = new DirectionalLight("light", new Vector3(-4.5, -9, 4).normalize(), scene);
    sun.position = sun.direction.negate().scaleInPlace(55);
    sun.diffuse = new Color3(1.0, 0.93, 0.8);
    sun.intensity = 1.25;

    const shadowGenerator = new ShadowGenerator(2048, sun);
    shadowGenerator.usePercentageCloserFiltering = true;
    shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_HIGH;
    shadowGenerator.bias = 0.0008;
    shadowGenerator.normalBias = 0.02;
    shadowGenerator.darkness = 0.35;

    const hemiLight = new HemisphericLight("hemi", Vector3.Up(), scene);
    hemiLight.diffuse = new Color3(0.52, 0.58, 0.78);
    hemiLight.groundColor = new Color3(0.2, 0.18, 0.16);
    hemiLight.intensity = 0.48;

    // --- Sky ---
    const skyMaterial = new SkyMaterial("skyMaterial", scene);
    skyMaterial.backFaceCulling = false;
    skyMaterial.useSunPosition = true;
    skyMaterial.sunPosition = sun.direction.negate();
    skyMaterial.luminance = 0.82;
    skyMaterial.turbidity = 3.8;
    skyMaterial.rayleigh = 1.3;
    skyMaterial.mieCoefficient = 0.004;
    skyMaterial.mieDirectionalG = 0.72;

    const skybox = MeshBuilder.CreateBox("skyBox", { size: 100.0 }, scene);
    skybox.material = skyMaterial;

    const rp = new ReflectionProbe("ref", 512, scene);
    rp.renderList?.push(skybox);
    scene.environmentTexture = rp.cubeTexture;

    // --- Ground ---
    const groundMaterial = createRockyTerrainMaterial("groundMat", scene, {
        uScale: 18,
        vScale: 18,
        baseTint: new Color3(0.55, 0.52, 0.48),
    });
    bindOutdoorEnvironment(groundMaterial, scene);
    const ground = MeshBuilder.CreateGround("ground", { width: 100, height: 100 });
    ground.material = groundMaterial;
    ground.receiveShadows = true;
    new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0 }, scene);

    // --- Physics demo boxes ---
    const boxTints = [
        new Color3(0.62, 0.22, 0.18),
        new Color3(0.35, 0.42, 0.55),
        new Color3(0.48, 0.38, 0.28),
        new Color3(0.28, 0.45, 0.32),
    ];
    for (let i = 0; i < 4; i++) {
        const boxMaterial = new PBRMetallicRoughnessMaterial(`boxMaterial_${i}`, scene);
        boxMaterial.baseColor = boxTints[i];
        boxMaterial.metallic = 0.08;
        boxMaterial.roughness = 0.82;
        bindOutdoorEnvironment(boxMaterial, scene);
        const box = MeshBuilder.CreateBox("Box", { size: 1 }, scene);
        box.material = boxMaterial;
        shadowGenerator.addShadowCaster(box);
        box.position.copyFromFloats((Math.random() - 0.5) * 6, 4 + Math.random() * 2, 5 + Math.random() * 2);
        const boxAggregate = new PhysicsAggregate(box, PhysicsShapeType.BOX, { mass: 10 }, scene);
        boxAggregate.body.applyAngularImpulse(new Vector3(Math.random(), Math.random(), Math.random()));
    }

    // --- Player ---
    const player = await PlayerController.CreateAsync(scene, input);
    player.getTransform().position.y = 3;
    shadowGenerator.addShadowCaster(player.model);

    attachStylizedRenderingPipeline(scene, player.camera.camera);

    const playerProgression = new PlayerProgression(player.health);
    const playerBuild = new PlayerBuild(player.health, playerProgression);

    // --- Target system + combat controller (before enemies for dodge i-frame wiring) ---
    const targetSystem = new TargetSystem(scene, player.getTransform());
    const combatController = new CombatController(
        player.getTransform(),
        player.physicsAggregate,
        input,
        targetSystem,
        playerBuild
    );
    player.combatController = combatController;

    const invuln = () => combatController.isDamageInvulnerable();

    // --- Enemies (three archetypes) ---
    // Enemy positions are spread around the arena so each archetype's
    // behaviour is clear: Chaser rushes in, Bruiser lumbers forward,
    // Caster hangs back and fires.
    const enemies: EnemyController[] = [
        new EnemyController(
            scene,
            new Vector3(-4, 1, 8),
            ARCHETYPE_MELEE_CHASER,
            player.getTransform(),
            player.health,
            invuln
        ),
        new EnemyController(
            scene,
            new Vector3(4, 1, 10),
            ARCHETYPE_HEAVY_BRUISER,
            player.getTransform(),
            player.health,
            invuln
        ),
        new EnemyController(
            scene,
            new Vector3(0, 1, 15),
            ARCHETYPE_RANGED_CASTER,
            player.getTransform(),
            player.health,
            invuln
        ),
    ];
    enemies.forEach((e) => shadowGenerator.addShadowCaster(e.mesh));
    enemies.forEach((e) => targetSystem.register(e));

    // --- Encounter manager (XP + loot table) ---
    const encounterManager = new EncounterManager(enemies, {
        xp: 150,
        lootTableId: LOOT_TABLE_ARENA_SPARRING.id,
        lootPickCount: 2,
    });

    encounterManager.onClear = (reward, loot) => {
        playerProgression.gainXp(reward.xp, () => {
            playerBuild.onLevelUp();
        });
        if (loot && loot.drops.length > 0) {
            playerBuild.applyLootDrops(loot.drops);
        }
    };

    const combatHud = new CombatHUD();

    return {
        player,
        enemies,
        targetSystem,
        combatController,
        combatHud,
        playerProgression,
        playerBuild,
        shadowGenerator,
        encounterManager,
    };
}

