import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import { PhysicsViewer } from "@babylonjs/core/Debug/physicsViewer";
import { Tools } from "@babylonjs/core/Misc/tools";
import HavokPhysics from "@babylonjs/havok";

import { InputManager } from "../game/input/InputManager";
import { createHubScene, HubSceneContext } from "../scenes/HubScene";

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

    private constructor(
        engine: Engine,
        scene: Scene,
        input: InputManager,
        hubCtx: HubSceneContext,
        canvas: HTMLCanvasElement
    ) {
        this.engine = engine;
        this.scene = scene;
        this.input = input;
        this.hubCtx = hubCtx;
        this.canvas = canvas;
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

        const boot = new GameBootstrap(engine, scene, input, hubCtx, canvas);
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
            ctx.dialogueSystem.update(this.input);
        } else {
            // NPC talk takes priority over gatherables on the same key (T).
            if (this.input.isJustPressed("t")) {
                const npc = ctx.interactionSystem.getNearbyNpc();
                if (npc !== null) {
                    ctx.handleInteraction(npc);
                } else {
                    const questId = ctx.gatherableManager.tryPickup(playerPos, this.input);
                    if (questId !== null) {
                        ctx.questManager.recordGather(questId);
                        ctx.questHud.showNotification("Gathered: bitterleaf", 2.0);
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
        }

        // HUD updates always run so panels stay visible during dialogue
        ctx.combatHud.update(
            ctx.combatController,
            ctx.targetSystem,
            ctx.player.health,
            ctx.encounterManager,
            ctx.playerProgression
        );
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

