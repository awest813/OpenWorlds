export enum CombatState {
    Idle = "Idle",
    Attacking = "Attacking",
    Dodging = "Dodging",
    Staggered = "Staggered",
    UsingAbility = "UsingAbility"
}

/**
 * Placeholder combat state machine.
 * Will manage melee combos, dodge, and ability usage once combat is implemented.
 */
export class CombatStateMachine {
    private state: CombatState = CombatState.Idle;

    getState(): CombatState {
        return this.state;
    }

    /** Transition to a new state if the transition is valid. */
    transition(next: CombatState): boolean {
        // TODO: add transition-validity rules (e.g. can't dodge while staggered)
        this.state = next;
        return true;
    }

    reset(): void {
        this.state = CombatState.Idle;
    }

    update(_deltaSeconds: number): void {
        // TODO: tick timers for combo windows, dodge i-frames, stagger recovery
    }
}
