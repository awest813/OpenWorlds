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
    // --- Lighting ---
    const sun = new DirectionalLight("light", new Vector3(-5, -10, 5).normalize(), scene);
    sun.position = sun.direction.negate().scaleInPlace(40);

    const shadowGenerator = new ShadowGenerator(1024, sun);
    shadowGenerator.useExponentialShadowMap = true;

    const hemiLight = new HemisphericLight("hemi", Vector3.Up(), scene);
    hemiLight.intensity = 0.4;

    // --- Sky ---
    const skyMaterial = new SkyMaterial("skyMaterial", scene);
    skyMaterial.backFaceCulling = false;
    skyMaterial.useSunPosition = true;
    skyMaterial.sunPosition = sun.direction.negate();

    const skybox = MeshBuilder.CreateBox("skyBox", { size: 100.0 }, scene);
    skybox.material = skyMaterial;

    const rp = new ReflectionProbe("ref", 512, scene);
    rp.renderList?.push(skybox);
    scene.environmentTexture = rp.cubeTexture;

    // --- Ground ---
    const groundMaterial = new PBRMetallicRoughnessMaterial("groundMat", scene);
    const ground = MeshBuilder.CreateGround("ground", { width: 100, height: 100 });
    ground.material = groundMaterial;
    ground.receiveShadows = true;
    new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0 }, scene);

    // --- Physics demo boxes ---
    for (let i = 0; i < 4; i++) {
        const boxMaterial = new PBRMetallicRoughnessMaterial("boxMaterial", scene);
        boxMaterial.baseColor = Color3.Random();
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

    // --- Enemies (three archetypes) ---
    // Enemy positions are spread around the arena so each archetype's
    // behaviour is clear: Chaser rushes in, Bruiser lumbers forward,
    // Caster hangs back and fires.
    const enemies: EnemyController[] = [
        new EnemyController(scene, new Vector3(-4, 1, 8), ARCHETYPE_MELEE_CHASER, player.getTransform(), player.health),
        new EnemyController(scene, new Vector3(4, 1, 10), ARCHETYPE_HEAVY_BRUISER, player.getTransform(), player.health),
        new EnemyController(scene, new Vector3(0, 1, 15), ARCHETYPE_RANGED_CASTER, player.getTransform(), player.health),
    ];
    enemies.forEach((e) => shadowGenerator.addShadowCaster(e.mesh));

    // --- Target system ---
    const targetSystem = new TargetSystem(scene, player.getTransform());
    enemies.forEach((e) => targetSystem.register(e));

    const playerProgression = new PlayerProgression(player.health);
    const playerBuild = new PlayerBuild(player.health, playerProgression);

    // --- Combat controller ---
    const combatController = new CombatController(
        player.getTransform(),
        player.physicsAggregate,
        input,
        targetSystem,
        playerBuild
    );
    player.combatController = combatController;

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

