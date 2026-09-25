// Tiny synthesized sound effects via WebAudio, so the game ships no audio files.
// The AudioContext is created lazily on the first user gesture (browsers
// refuse to start audio otherwise).

type Wave = OscillatorType;

export class Sfx {
    private ctx: AudioContext | null = null;
    muted = false;

    /** Call from a click/tap handler. */
    unlock() {
        if (!this.ctx) {
            const Ctor = window.AudioContext
                ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!Ctor) return;
            this.ctx = new Ctor();
        }
        if (this.ctx.state === 'suspended') void this.ctx.resume();
    }

    private tone(freq: number, endFreq: number, duration: number, wave: Wave, volume: number, delay = 0) {
        const ctx = this.ctx;
        if (!ctx || this.muted) return;
        const start = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = wave;
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration + 0.05);
    }

    /** Smaller meals give a higher-pitched gulp. */
    eat(relativeSize: number) {
        const base = 520 - Math.min(relativeSize, 1) * 260;
        this.tone(base, base * 1.8, 0.12, 'sine', 0.22);
        this.tone(base * 0.5, base * 0.9, 0.1, 'triangle', 0.12, 0.03);
    }

    bump() {
        this.tone(160, 90, 0.12, 'triangle', 0.15);
    }

    speciesUnlocked() {
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f * 1.01, 0.18, 'triangle', 0.16, i * 0.09));
    }

    gameOver() {
        this.tone(440, 110, 0.7, 'sawtooth', 0.12);
        this.tone(220, 55, 0.8, 'sine', 0.2, 0.05);
    }

    dispose() {
        void this.ctx?.close();
        this.ctx = null;
    }
}
