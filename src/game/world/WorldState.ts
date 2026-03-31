/**
 * Lightweight world-state registry for tracking quest flags and progression.
 * A single source of truth for boolean flags and numeric counters that
 * NPCs and systems can query to adjust their behaviour.
 */
export class WorldState {
    private readonly flags = new Map<string, boolean>();
    private readonly counters = new Map<string, number>();

    setFlag(key: string, value: boolean): void {
        this.flags.set(key, value);
    }

    getFlag(key: string): boolean {
        return this.flags.get(key) ?? false;
    }

    setCounter(key: string, value: number): void {
        this.counters.set(key, value);
    }

    getCounter(key: string): number {
        return this.counters.get(key) ?? 0;
    }

    incrementCounter(key: string, by = 1): number {
        const val = this.getCounter(key) + by;
        this.counters.set(key, val);
        return val;
    }
}
