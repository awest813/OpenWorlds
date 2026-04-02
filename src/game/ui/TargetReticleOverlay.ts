import { Engine } from "@babylonjs/core/Engines/engine";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";
import { Control } from "@babylonjs/gui/2D/controls/control";
import { Image } from "@babylonjs/gui/2D/controls/image";

import targetLockPng from "../../assets/external/spacepirates/targetlock.png";
import { TargetSystem } from "../combat/TargetSystem";

/**
 * Screen-space reticle using Space Pirates demo UI art (BabylonJS/SpacePirates).
 * Follows the locked target’s head height in 2D.
 */
export class TargetReticleOverlay {
    private readonly scene: Scene;
    private readonly adt: AdvancedDynamicTexture;
    private readonly reticle: Image;

    constructor(engine: Engine, scene: Scene) {
        this.scene = scene;
        this.adt = AdvancedDynamicTexture.CreateFullscreenUI("targetReticleUI", true, scene);
        this.reticle = new Image("targetReticle", targetLockPng);
        this.reticle.width = "52px";
        this.reticle.height = "52px";
        this.reticle.alpha = 0;
        this.reticle.isPointerBlocker = false;
        this.reticle.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.reticle.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this.adt.addControl(this.reticle);

        engine.onResizeObservable.add(() => this.adt.markAsDirty());
    }

    clear(): void {
        this.reticle.alpha = 0;
    }

    update(targetSystem: TargetSystem): void {
        const enemy = targetSystem.getCurrentTarget();
        const cam = this.scene.activeCamera;
        const engine = this.scene.getEngine() as Engine | null;

        if (enemy === null || !enemy.isAlive() || cam === null || engine === null) {
            this.reticle.alpha = 0;
            return;
        }

        const pos = enemy.mesh.getAbsolutePosition().clone();
        const extendY = enemy.mesh.getBoundingInfo().boundingBox.extendSizeWorld.y;
        pos.y += extendY + 0.12;

        const w = engine.getRenderWidth(true);
        const h = engine.getRenderHeight(true);
        const projected = Vector3.Project(
            pos,
            Matrix.Identity(),
            this.scene.getTransformMatrix(),
            cam.viewport.toGlobal(w, h)
        );

        const half = 26;
        this.reticle.left = `${projected.x - half}px`;
        this.reticle.top = `${h - projected.y - half}px`;
        this.reticle.alpha = 0.9;
    }

    dispose(): void {
        this.adt.dispose();
    }
}
