import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { Scene } from "@babylonjs/core/scene";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";

import "@babylonjs/core/Animations/animatable";
import "@babylonjs/core/Culling/ray";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";

import character from "../../assets/character.glb";
import { InputManager } from "../input/InputManager";
import { ThirdPersonCamera } from "../camera/ThirdPersonCamera";
import { moveTowards } from "../../utils/math";

export interface PlayerKeyBindings {
    forward: string;
    backward: string;
    left: string;
    right: string;
}

const DEFAULT_BINDINGS: PlayerKeyBindings = {
    forward: "w",
    backward: "s",
    left: "a",
    right: "d"
};

export class PlayerController {
    readonly model: AbstractMesh;
    private readonly impostorMesh: AbstractMesh;
    readonly physicsAggregate: PhysicsAggregate;

    readonly moveSpeed = 1.8;
    readonly rotationSpeed = 6;
    readonly animationBlendSpeed = 4.0;

    private readonly walkAnim: AnimationGroup;
    private readonly idleAnim: AnimationGroup;
    private readonly nonIdleAnimations: AnimationGroup[];
    private targetAnim: AnimationGroup;

    private readonly input: InputManager;
    readonly camera: ThirdPersonCamera;
    readonly keys: PlayerKeyBindings;

    static async CreateAsync(scene: Scene, input: InputManager, keys?: PlayerKeyBindings): Promise<PlayerController> {
        const result = await SceneLoader.ImportMeshAsync("", "", character, scene);
        const model = result.meshes[0];
        return new PlayerController(model, scene, input, keys ?? DEFAULT_BINDINGS);
    }

    private constructor(characterMesh: AbstractMesh, scene: Scene, input: InputManager, keys: PlayerKeyBindings) {
        this.input = input;
        this.keys = keys;

        this.impostorMesh = MeshBuilder.CreateCapsule("CharacterTransform", { height: 2, radius: 0.5 }, scene);
        this.impostorMesh.visibility = 0.1;
        this.impostorMesh.rotationQuaternion = Quaternion.Identity();

        this.model = characterMesh;
        this.model.parent = this.impostorMesh;
        this.model.rotate(Vector3.Up(), Math.PI);
        this.model.position.y = -1;

        this.camera = new ThirdPersonCamera(scene, this.impostorMesh);

        const walkAnimGroup = scene.getAnimationGroupByName("Walking");
        if (walkAnimGroup === null) throw new Error("'Walking' animation not found");
        this.walkAnim = walkAnimGroup;
        this.walkAnim.weight = 0;

        const idleAnimGroup = scene.getAnimationGroupByName("Idle");
        if (idleAnimGroup === null) throw new Error("'Idle' animation not found");
        this.idleAnim = idleAnimGroup;
        this.idleAnim.weight = 1;

        this.targetAnim = this.idleAnim;
        this.nonIdleAnimations = [this.walkAnim];

        this.physicsAggregate = new PhysicsAggregate(this.getTransform(), PhysicsShapeType.CAPSULE, { mass: 1, friction: 0.5 });
        this.physicsAggregate.body.setMassProperties({ inertia: Vector3.ZeroReadOnly });
        this.physicsAggregate.body.setAngularDamping(100);
        this.physicsAggregate.body.setLinearDamping(10);
    }

    getTransform() {
        return this.impostorMesh;
    }

    update(deltaSeconds: number): void {
        this.targetAnim = this.idleAnim;

        const angle180 = Math.PI;
        const angle45 = angle180 / 4;
        const angle90 = angle180 / 2;
        const angle135 = angle45 + angle90;

        const forward = this.camera.getForwardOnGround();
        const rot = Quaternion.FromLookDirectionLH(forward, Vector3.Up());

        let rotation = 0;
        const fwd = this.input.isKeyDown(this.keys.forward);
        const bwd = this.input.isKeyDown(this.keys.backward);
        const lft = this.input.isKeyDown(this.keys.left);
        const rgt = this.input.isKeyDown(this.keys.right);

        if (bwd && !rgt && !lft) rotation = angle180;
        if (lft && !fwd && !bwd) rotation = -angle90;
        if (rgt && !fwd && !bwd) rotation = angle90;
        if (fwd && rgt) rotation = angle45;
        if (fwd && lft) rotation = -angle45;
        if (bwd && rgt) rotation = angle135;
        if (bwd && lft) rotation = -angle135;

        rot.multiplyInPlace(Quaternion.RotationAxis(Vector3.Up(), rotation));

        if (fwd || bwd || lft || rgt) {
            this.targetAnim = this.walkAnim;

            const impostorQuaternion = this.impostorMesh.rotationQuaternion;
            if (impostorQuaternion === null) {
                throw new Error("Impostor quaternion is null");
            }
            Quaternion.SlerpToRef(impostorQuaternion, rot, this.rotationSpeed * deltaSeconds, impostorQuaternion);
            this.impostorMesh.translate(new Vector3(0, 0, -1), this.moveSpeed * deltaSeconds);
            this.physicsAggregate.body.setTargetTransform(this.impostorMesh.absolutePosition, impostorQuaternion);
        }

        this.blendAnimations(deltaSeconds);
    }

    private blendAnimations(deltaSeconds: number): void {
        let weightSum = 0;
        for (const animation of this.nonIdleAnimations) {
            if (animation === this.targetAnim) {
                animation.weight = moveTowards(animation.weight, 1, this.animationBlendSpeed * deltaSeconds);
            } else {
                animation.weight = moveTowards(animation.weight, 0, this.animationBlendSpeed * deltaSeconds);
            }
            if (animation.weight > 0 && !animation.isPlaying) animation.play(true);
            if (animation.weight === 0 && animation.isPlaying) animation.pause();

            weightSum += animation.weight;
        }

        this.idleAnim.weight = moveTowards(
            this.idleAnim.weight,
            Math.min(Math.max(1 - weightSum, 0.0), 1.0),
            this.animationBlendSpeed * deltaSeconds
        );
    }

    dispose(): void {
        this.impostorMesh.dispose();
        this.model.dispose();
        this.physicsAggregate.dispose();
        this.camera.dispose();
    }
}
