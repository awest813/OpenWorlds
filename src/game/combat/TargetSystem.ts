import { TransformNode } from "@babylonjs/core/Meshes/transformNode";

/**
 * Placeholder target/focus system.
 * Will handle lock-on cycling, soft targeting, and attack magnetism.
 */
export class TargetSystem {
    private currentTarget: TransformNode | null = null;
    private readonly targets: TransformNode[] = [];

    register(target: TransformNode): void {
        this.targets.push(target);
    }

    unregister(target: TransformNode): void {
        const idx = this.targets.indexOf(target);
        if (idx !== -1) this.targets.splice(idx, 1);
        if (this.currentTarget === target) this.currentTarget = null;
    }

    getCurrentTarget(): TransformNode | null {
        return this.currentTarget;
    }

    /** Cycle to the next available target. */
    cycleTarget(): void {
        if (this.targets.length === 0) {
            this.currentTarget = null;
            return;
        }
        const idx = this.currentTarget ? this.targets.indexOf(this.currentTarget) : -1;
        // If current target was removed (idx === -1), start from the first target
        const nextIdx = idx === -1 ? 0 : (idx + 1) % this.targets.length;
        this.currentTarget = this.targets[nextIdx];
    }

    clearTarget(): void {
        this.currentTarget = null;
    }

    update(_deltaSeconds: number): void {
        // TODO: remove dead targets, update soft-target selection by proximity/angle
    }
}
