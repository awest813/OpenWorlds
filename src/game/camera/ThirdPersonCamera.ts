import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export class ThirdPersonCamera {
    readonly camera: ArcRotateCamera;
    private readonly attachPoint: TransformNode;
    private readonly pointerLockCanvas: HTMLCanvasElement | null;
    private readonly pointerLockCleanup: (() => void) | null;

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
