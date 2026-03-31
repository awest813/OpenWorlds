import { ActionManager, ExecuteCodeAction } from "@babylonjs/core/Actions";
import { Scene } from "@babylonjs/core/scene";

export class InputManager {
    private readonly keyState: Map<string, boolean> = new Map();

    constructor(scene: Scene) {
        scene.actionManager = new ActionManager(scene);
        scene.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (e) => {
                this.keyState.set(e.sourceEvent.key, true);
            })
        );
        scene.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (e) => {
                this.keyState.set(e.sourceEvent.key, false);
            })
        );
    }

    isKeyDown(key: string): boolean {
        return this.keyState.get(key) === true;
    }
}
