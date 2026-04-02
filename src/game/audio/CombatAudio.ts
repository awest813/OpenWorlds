import { Scene } from "@babylonjs/core/scene";

/**
 * Lightweight procedural combat SFX via Web Audio (no asset files).
 * The AudioContext starts suspended until a user gesture unlocks it.
 */
export class CombatAudio {
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private unlocked = false;

    constructor(scene: Scene) {
        const canvas = scene.getEngine().getRenderingCanvas();
        const unlock = () => this.ensureResumed();

        window.addEventListener("keydown", unlock, { once: true });
        window.addEventListener("pointerdown", unlock, { once: true });
        if (canvas) {
            canvas.addEventListener("pointerdown", unlock, { once: true });
        }
    }

    private getContext(): AudioContext | null {
        if (this.ctx) return this.ctx;
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return null;
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.35;
        this.master.connect(this.ctx.destination);
        return this.ctx;
    }

    private ensureResumed(): void {
        const ctx = this.getContext();
        if (!ctx || this.unlocked) return;
        if (ctx.state === "suspended") {
            void ctx.resume().then(() => {
                this.unlocked = true;
            });
        } else {
            this.unlocked = true;
        }
    }

    private out(): AudioNode | null {
        this.ensureResumed();
        return this.master;
    }

    /** Successful melee hit; comboStep 0–2 slightly varies pitch. */
    playMeleeHit(comboStep: number): void {
        const ctx = this.getContext();
        const dest = this.out();
        if (!ctx || !dest) return;

        const t = ctx.currentTime;
        const base = 180 + comboStep * 45;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(base, t);
        osc.frequency.exponentialRampToValueAtTime(base * 0.35, t + 0.06);
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.13);

        const noise = this.noiseBurst(ctx, t, 0.045, 0.12, 2800);
        if (noise) noise.connect(dest);
    }

    /** Melee swing with no target in range. */
    playMeleeWhiff(): void {
        const ctx = this.getContext();
        const dest = this.out();
        if (!ctx || !dest) return;

        const t = ctx.currentTime;
        const noise = this.noiseBurst(ctx, t, 0.06, 0.05, 1200);
        if (noise) noise.connect(dest);

        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(420, t);
        osc.frequency.linearRampToValueAtTime(90, t + 0.08);
        g.gain.setValueAtTime(0.06, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(g);
        g.connect(dest);
        osc.start(t);
        osc.stop(t + 0.11);
    }

    playDodge(): void {
        const ctx = this.getContext();
        const dest = this.out();
        if (!ctx || !dest) return;

        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.exponentialRampToValueAtTime(55, t + 0.14);
        g.gain.setValueAtTime(0.1, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        osc.connect(g);
        g.connect(dest);
        osc.start(t);
        osc.stop(t + 0.17);

        const noise = this.noiseBurst(ctx, t, 0.04, 0.07, 900);
        if (noise) noise.connect(dest);
    }

    playDashStrike(): void {
        const ctx = this.getContext();
        const dest = this.out();
        if (!ctx || !dest) return;

        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(95, t);
        osc.frequency.exponentialRampToValueAtTime(380, t + 0.1);
        g.gain.setValueAtTime(0.08, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.connect(g);
        g.connect(dest);
        osc.start(t);
        osc.stop(t + 0.19);
    }

    playSpinSlash(): void {
        const ctx = this.getContext();
        const dest = this.out();
        if (!ctx || !dest) return;

        const t = ctx.currentTime;
        for (let i = 0; i < 3; i++) {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = "triangle";
            const start = 200 + i * 80;
            osc.frequency.setValueAtTime(start, t + i * 0.028);
            osc.frequency.exponentialRampToValueAtTime(start * 2.2, t + i * 0.028 + 0.05);
            g.gain.setValueAtTime(0, t + i * 0.028);
            g.gain.linearRampToValueAtTime(0.07, t + i * 0.028 + 0.012);
            g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.028 + 0.09);
            osc.connect(g);
            g.connect(dest);
            osc.start(t + i * 0.028);
            osc.stop(t + i * 0.028 + 0.1);
        }
    }

    private noiseBurst(
        ctx: AudioContext,
        startTime: number,
        duration: number,
        peak: number,
        filterFreq: number
    ): GainNode | null {
        const len = Math.max(1, Math.floor(ctx.sampleRate * duration));
        const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < len; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        }
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = filterFreq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(peak, startTime);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        src.connect(filter);
        filter.connect(g);
        src.start(startTime);
        src.stop(startTime + duration + 0.02);
        return g;
    }
}
