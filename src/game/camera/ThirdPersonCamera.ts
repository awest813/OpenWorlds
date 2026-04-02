import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export class ThirdPersonCamera {
    readonly camera: ArcRotateCamera;
    private readonly attachPoint: TransformNode;
    private readonly pointerLockCanvas: HTMLCanvasElement | null;
    private readonly pointerLockCleanup: (() => void) | null;

    /** Decaying upward angular velocity on melee hit (applied to camera beta). */
    private combatPunchVelocity = 0;

    constructor(scene: Scene, target: TransformNode) {
        this.attachPoint = new TransformNode("cameraAttachPoint", scene);
        this.attachPoint.parent = target;
        this.attachPoint.position = new Vector3(0, 1.5, 0);

        this.camera = new ArcRotateCamera("thirdPersonCamera", -1.5, 1.2, 5, Vector3.Zero(), scene);
        this.camera.attachControl(true);
        this.camera.setTarget(this.attachPoint);
        this.camera.wheelPrecision = 200;
        this.camera.lowerRadiusLimit = 3;
        this.camera.upperBetaLimit = Math.PI / 2 + 0.2;
        this.camera.inertia = 0.88;

        const canvas = scene.getEngine().getRenderingCanvas();
        this.pointerLockCanvas = canvas ?? null;
        if (canvas) {
            const onCanvasClick = () => {
                void canvas.requestPointerLock();
            };
            const onKeyDown = (e: KeyboardEvent) => {
                if (e.key === "Escape" && document.pointerLockElement === canvas) {
                    document.exitPointerLock();
                }
            };
            canvas.addEventListener("click", onCanvasClick);
            document.addEventListener("keydown", onKeyDown);
            this.pointerLockCleanup = () => {
                canvas.removeEventListener("click", onCanvasClick);
                document.removeEventListener("keydown", onKeyDown);
            };
        } else {
            this.pointerLockCleanup = null;
        }
    }

    getForwardOnGround(): Vector3 {
        const direction = this.camera.getForwardRay().direction;
        return new Vector3(direction.x, 0, direction.z).normalize();
    }

    /** Call from the main loop; integrates hit-punch velocity into camera beta. */
    updateCombatFeel(deltaSeconds: number): void {
        if (Math.abs(this.combatPunchVelocity) < 1e-6) {
            return;
        }
        this.camera.beta += this.combatPunchVelocity * deltaSeconds;
        const betaCap = this.camera.upperBetaLimit ?? Math.PI / 2 + 0.2;
        this.camera.beta = Math.min(this.camera.beta, betaCap);
        this.combatPunchVelocity *= Math.exp(-deltaSeconds * 14);
        if (Math.abs(this.combatPunchVelocity) < 1e-4) {
            this.combatPunchVelocity = 0;
        }
    }

    /** Brief upward camera kick when the player lands a damaging melee hit. */
    applyCombatPunch(strength = 1): void {
        const s = Math.min(Math.max(strength, 0), 2);
        this.combatPunchVelocity = Math.min(this.combatPunchVelocity + 0.95 * s, 1.6);
    }

    dispose(): void {
        const c = this.pointerLockCanvas;
        if (c && document.pointerLockElement === c) {
            document.exitPointerLock();
        }
        this.pointerLockCleanup?.();
        this.attachPoint.dispose();
        this.camera.dispose();
    }
}
