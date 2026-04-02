import { Scene } from "@babylonjs/core/scene";

/**
 * Thin input wrapper that tracks both held keys (isKeyDown) and
 * single-frame key-presses (isJustPressed).
 *
 * Call clearFrame() once per game loop tick after all systems have read
 * their inputs so that "just-pressed" state is flushed correctly.
 */
export class InputManager {
    private readonly keyState = new Map<string, boolean>();
    private readonly justPressedSet = new Set<string>();

    constructor(scene: Scene) {
        const canvas = scene.getEngine().getRenderingCanvas();

        window.addEventListener("keydown", (e) => {
            // Prevent browser defaults for game-reserved keys
            if (
                [" ", "f", "e", "j", "t", "Tab", "c", "C", "q", "Q", "h", "H", "k", "K", "Shift", "Control"].includes(
                    e.key
                )
            ) {
                e.preventDefault();
            }
            if (e.key >= "1" && e.key <= "9") e.preventDefault();
            if (!this.keyState.get(e.key)) {
                this.justPressedSet.add(e.key);
            }
            this.keyState.set(e.key, true);
        });

        window.addEventListener("keyup", (e) => {
            this.keyState.set(e.key, false);
        });

        // Mouse buttons – stored as "mouse0", "mouse1", etc.
        if (canvas) {
            canvas.addEventListener("mousedown", (e) => {
                const key = `mouse${e.button}`;
                if (!this.keyState.get(key)) {
                    this.justPressedSet.add(key);
                }
                this.keyState.set(key, true);
            });

            canvas.addEventListener("mouseup", (e) => {
                this.keyState.set(`mouse${e.button}`, false);
            });
        }
    }

    /** True while the key is held this frame. */
    isKeyDown(key: string): boolean {
        return this.keyState.get(key) === true;
    }

    /**
     * True only on the first frame the key was pressed.
     * Resets after clearFrame() is called.
     */
    isJustPressed(key: string): boolean {
        return this.justPressedSet.has(key);
    }

    /** Flush single-frame press state.  Call once at the end of each update tick. */
    clearFrame(): void {
        this.justPressedSet.clear();
    }
}
