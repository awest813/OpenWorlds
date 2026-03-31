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
import { EnemyController } from "../game/combat/EnemyController";
import { TargetSystem } from "../game/combat/TargetSystem";
import { CombatController } from "../game/combat/CombatController";
import { CombatHUD } from "../game/ui/CombatHUD";

export interface ArenaSceneContext {
    player: PlayerController;
    enemy: EnemyController;
    targetSystem: TargetSystem;
    combatController: CombatController;
    combatHud: CombatHUD;
    shadowGenerator: ShadowGenerator;
}

/** Sets up the test arena: ground, lighting, sky, player, and one enemy. */
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

    // --- Enemy ---
    const enemy = new EnemyController(scene, new Vector3(3, 1, 5));
    shadowGenerator.addShadowCaster(enemy.mesh);

    // --- Target system ---
    const targetSystem = new TargetSystem(scene, player.getTransform());
    targetSystem.register(enemy);

    // --- Combat controller ---
    const combatController = new CombatController(
        player.getTransform(),
        player.physicsAggregate,
        input,
        targetSystem
    );
    player.combatController = combatController;

    // --- HUD ---
    const combatHud = new CombatHUD();

    return { player, enemy, targetSystem, combatController, combatHud, shadowGenerator };
}
