import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import { PhysicsViewer } from "@babylonjs/core/Debug/physicsViewer";
import { Tools } from "@babylonjs/core/Misc/tools";
import HavokPhysics from "@babylonjs/havok";

import { InputManager } from "../game/input/InputManager";
import { createArenaScene, ArenaSceneContext } from "../scenes/ArenaScene";

/**
 * GameBootstrap owns the engine, scene, and top-level game loop.
 * Scenes supply their own content; the bootstrap manages lifecycle.
 */
export class GameBootstrap {
    private engine: Engine;
    private scene: Scene;
    private input: InputManager;
    private arenaCtx: ArenaSceneContext;
    private physicsViewer: PhysicsViewer;
    private bodyShown = false;
    private readonly canvas: HTMLCanvasElement;

    private constructor(
        engine: Engine,
        scene: Scene,
        input: InputManager,
        arenaCtx: ArenaSceneContext,
        canvas: HTMLCanvasElement
    ) {
        this.engine = engine;
        this.scene = scene;
        this.input = input;
        this.arenaCtx = arenaCtx;
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
        const arenaCtx = await createArenaScene(scene, input);

        const boot = new GameBootstrap(engine, scene, input, arenaCtx, canvas);
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

        // Combat must run before PlayerController so the movement lock is
        // already set when player.update() reads isMovementLocked().
        this.arenaCtx.combatController.update(dt);
        this.arenaCtx.player.update(dt);

        // Pass dt = 0 to enemies during hit-pause so they freeze briefly
        // in place, giving melee swings a punchy feel.
        const enemyDt = this.arenaCtx.combatController.isHitPaused() ? 0 : dt;
        for (const enemy of this.arenaCtx.enemies) {
            enemy.update(enemyDt);
        }

        this.arenaCtx.targetSystem.update(dt);
        this.arenaCtx.encounterManager.update(dt);
        this.arenaCtx.combatHud.update(
            this.arenaCtx.combatController,
            this.arenaCtx.targetSystem,
            this.arenaCtx.player.health,
            this.arenaCtx.encounterManager
        );

        // Flush single-frame input state last so all systems see it this tick.
        this.input.clearFrame();
    }

    private bindDebugKeys(canvas: HTMLCanvasElement): void {
        document.addEventListener("keydown", (e) => {
            if (e.key === "p") {
                Tools.CreateScreenshot(this.engine, this.arenaCtx.player.camera.camera, {
                    width: canvas.width,
                    height: canvas.height
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
            // R = quick arena reset (full page reload for prototype simplicity)
            if (e.key === "r" || e.key === "R") {
                window.location.reload();
            }
        });
    }
}

