import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import "@babylonjs/core/Physics/joinedPhysicsEngineComponent";
import "@babylonjs/core/Physics/v2/physicsEngineComponent";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import { PhysicsViewer } from "@babylonjs/core/Debug/physicsViewer";
import { Tools } from "@babylonjs/core/Misc/tools";
import HavokPhysics from "@babylonjs/havok";

import { InputManager } from "../game/input/InputManager";
import { createHubScene, HubSceneContext } from "../scenes/HubScene";
import { ControlsOverlay } from "../game/ui/ControlsOverlay";
import { InventoryHUD } from "../game/ui/InventoryHUD";
import { SkillTreePanel } from "../game/ui/SkillTreePanel";
import { TargetReticleOverlay } from "../game/ui/TargetReticleOverlay";

/**
 * GameBootstrap owns the engine, scene, and top-level game loop.
 * Scenes supply their own content; the bootstrap manages lifecycle.
 */
export class GameBootstrap {
    private engine: Engine;
    private scene: Scene;
    private input: InputManager;
    private hubCtx: HubSceneContext;
    private physicsViewer: PhysicsViewer;
    private bodyShown = false;
    private readonly canvas: HTMLCanvasElement;
    private readonly controlsOverlay: ControlsOverlay;
    private readonly inventoryHud: InventoryHUD;
    private readonly skillTreePanel: SkillTreePanel;
    private readonly targetReticle: TargetReticleOverlay;

    private constructor(
        engine: Engine,
        scene: Scene,
        input: InputManager,
        hubCtx: HubSceneContext,
        canvas: HTMLCanvasElement,
        controlsOverlay: ControlsOverlay,
        inventoryHud: InventoryHUD,
        skillTreePanel: SkillTreePanel,
        targetReticle: TargetReticleOverlay
    ) {
        this.engine = engine;
        this.scene = scene;
        this.input = input;
        this.hubCtx = hubCtx;
        this.canvas = canvas;
        this.controlsOverlay = controlsOverlay;
        this.inventoryHud = inventoryHud;
        this.skillTreePanel = skillTreePanel;
        this.targetReticle = targetReticle;
        this.physicsViewer = new PhysicsViewer(scene);
    }

    static async CreateAsync(canvas: HTMLCanvasElement): Promise<GameBootstrap> {
        const engine = new Engine(canvas);
        engine.displayLoadingUI();

        const havokInstance = await HavokPhysics();
        const havokPlugin = new HavokPlugin(true, havokInstance);

        const scene = new Scene(engine);
        scene.enablePhysics(new Vector3(0, -9.81, 0), havokPlugin);

        const input = new InputManager(scene);
        const hubCtx = await createHubScene(scene, input);
        const controlsOverlay = new ControlsOverlay();
        const inventoryHud = new InventoryHUD();
        const skillTreePanel = new SkillTreePanel();
        const targetReticle = new TargetReticleOverlay(engine, scene);

        const boot = new GameBootstrap(
            engine,
            scene,
            input,
            hubCtx,
            canvas,
            controlsOverlay,
            inventoryHud,
            skillTreePanel,
            targetReticle
        );
        boot.bindDebugKeys(canvas);
        boot.startLoop(canvas);
        return boot;
    }

    private startLoop(canvas: HTMLCanvasElement): void {
        this.scene.executeWhenReady(() => {
            this.engine.loadingScreen.hideLoadingUI();
            this.scene.onBeforeRenderObservable.add(() => this.update());
            this.engine.runRenderLoop(() => this.scene.render());
        });

        window.addEventListener("resize", () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            this.engine.resize();
        });
    }

    private update(): void {
        const dt = this.engine.getDeltaTime() / 1000;
        const ctx = this.hubCtx;

        // NPC pulse animations run regardless of dialogue state
        for (const npc of ctx.npcs) {
            npc.update(dt);
        }

        // Proximity detection always runs so the interact prompt stays current
        const playerPos = ctx.player.getTransform().getAbsolutePosition();
        ctx.interactionSystem.updateProximity(playerPos);

        if (ctx.dialogueSystem.isActive()) {
            // Dialogue mode: freeze movement/combat; only process dialogue input
            this.targetReticle.clear();
            this.inventoryHud.hide();
            this.skillTreePanel.hide();
            ctx.dialogueSystem.update(this.input);
        } else {
            // NPC talk takes priority over gatherables on the same key (T).
            if (this.input.isJustPressed("t")) {
                const npc = ctx.interactionSystem.getNearbyNpc();
                if (npc !== null) {
                    ctx.handleInteraction(npc);
                } else {
                    const pickup = ctx.gatherableManager.tryPickup(playerPos, this.input);
                    if (pickup !== null) {
                        ctx.questManager.recordGather(pickup.questId);
                        ctx.questHud.showNotification(`Gathered: ${pickup.pickupToastLabel}`, 2.0);
                    }
                }
            }

            // Combat must run before PlayerController so the movement lock is
            // already set when player.update() reads isMovementLocked().
            ctx.combatController.update(dt);
            ctx.player.update(dt);

            // Pass dt = 0 to enemies during hit-pause so they freeze briefly
            // in place, giving melee swings a punchy feel.
            const enemyDt = ctx.combatController.isHitPaused() ? 0 : dt;
            for (const enemy of ctx.enemies) {
                enemy.update(enemyDt);
            }

            ctx.targetSystem.update(dt);
            ctx.encounterManager.update(dt);
            this.targetReticle.update(ctx.targetSystem);
        }

        // HUD updates always run so panels stay visible during dialogue
        ctx.combatHud.update(
            ctx.combatController,
            ctx.targetSystem,
            ctx.player.health,
            ctx.encounterManager,
            ctx.playerProgression,
            ctx.playerBuild
        );

        if (this.input.isJustPressed("i") || this.input.isJustPressed("I")) {
            this.inventoryHud.toggle(ctx.playerBuild);
        }

        if (this.input.isJustPressed("c") || this.input.isJustPressed("C")) {
            ctx.playerBuild.cycleClass();
            ctx.questHud.showNotification(`Class: ${ctx.playerBuild.getClassDisplayName()}`, 2.0);
        }
        for (let d = 1; d <= 9; d++) {
            const key = String(d);
            if (this.input.isJustPressed(key)) {
                const list = ctx.playerBuild.listUnlockableSkillNodes();
                const node = list[d - 1];
                if (node && ctx.playerBuild.skillTree.tryUnlock(node.id)) {
                    ctx.questHud.showNotification(`Skill: ${node.displayName}`, 2.2);
                }
            }
        }

        const gatherPrompt =
            ctx.interactionSystem.getNearbyNpc() === null
                ? ctx.gatherableManager.getPromptInRange(playerPos)
                : null;
        ctx.questHud.update(
            dt,
            ctx.questManager,
            ctx.interactionSystem.getNearbyNpc()?.name ?? null,
            gatherPrompt
        );

        this.controlsOverlay.update(this.input);
        if (!ctx.dialogueSystem.isActive()) {
            this.skillTreePanel.update(this.input, ctx.playerBuild);
        }

        // Flush single-frame input state last so all systems see it this tick.
        this.input.clearFrame();
    }

    private bindDebugKeys(canvas: HTMLCanvasElement): void {
        document.addEventListener("keydown", (e) => {
            if (e.key === "p") {
                Tools.CreateScreenshot(this.engine, this.hubCtx.player.camera.camera, {
                    width: canvas.width,
                    height: canvas.height,
                });
            }
            if (e.key === "v") {
                this.bodyShown = !this.bodyShown;
                const viewer = this.physicsViewer;
                if (this.bodyShown) {
                    this.scene.transformNodes.forEach((t) => {
                        if (t.physicsBody) viewer.showBody(t.physicsBody);
                    });
                    this.scene.meshes.forEach((m) => {
                        if (m.physicsBody) viewer.showBody(m.physicsBody);
                    });
                } else {
                    this.scene.transformNodes.forEach((t) => {
                        if (t.physicsBody) viewer.hideBody(t.physicsBody);
                    });
                    this.scene.meshes.forEach((m) => {
                        if (m.physicsBody) viewer.hideBody(m.physicsBody);
                    });
                }
            }
            // R = quick reset (full page reload for prototype simplicity)
            if (e.key === "r" || e.key === "R") {
                window.location.reload();
            }
        });
    }
}

