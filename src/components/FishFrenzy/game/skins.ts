import type { PowerKind } from './config';

// Procedural skins for the fish. The models have no usable UVs, so patterns
// are painted in the fragment shader from the normalized body position
// (z: tail -0.5 → head +0.5, y: belly → back). Colours are sRGB hex.

export interface FishSkin {
    back: string;          // dorsal colour
    belly: string;         // ventral colour (countershading)
    stripe?: { color: string; y: number; width: number }; // lateral band, y in -1 (belly) … 1 (back)
    bars?: { color: string; count: number; strength: number }; // vertical bands along the body
    spots?: { color: string; density: number; size: number; pulse?: boolean };
    fin: string;           // fins and tail
    tailStart: number;     // z below which the tail colour takes over
    sheen: string;         // iridescent glint at grazing angles
    scales: number;        // strength of the fine scale texture
}

export const PLAYER_SKIN: FishSkin = {
    back: '#1558d6',
    belly: '#a8fff4',
    stripe: { color: '#27e3d4', y: 0.15, width: 0.35 },
    fin: '#ffd23f',        // sunny tail and fins so you can always spot yourself
    tailStart: -0.3,
    sheen: '#9ffcff',
    scales: 0.07,
};

/** Every species has a few colour morphs; each spawned fish picks one at random. */
export const SPECIES_SKINS: Record<string, FishSkin[]> = {
    clownfish: [
        { back: '#ff6a00', belly: '#ffb066', bars: { color: '#ffffff', count: 3, strength: 0.95 }, fin: '#ff7a14', tailStart: -0.32, sheen: '#fff1d6', scales: 0.04 },
        { back: '#8e1620', belly: '#c23a36', bars: { color: '#fff4e0', count: 3, strength: 0.95 }, fin: '#6e0f16', tailStart: -0.32, sheen: '#ffd6d6', scales: 0.04 },
        { back: '#ff9f1c', belly: '#ffd08a', bars: { color: '#1a1a1a', count: 3, strength: 0.6 }, fin: '#ff8c00', tailStart: -0.32, sheen: '#fff1d6', scales: 0.04 },
    ],
    goldfish: [
        { back: '#ff6a13', belly: '#ffd98a', spots: { color: '#fff4e6', density: 16, size: 0.36 }, fin: '#ffb347', tailStart: -0.25, sheen: '#fff0b3', scales: 0.09 },
        { back: '#e0201b', belly: '#fff3ee', spots: { color: '#ffffff', density: 9, size: 0.45 }, fin: '#ff6b5e', tailStart: -0.25, sheen: '#ffe0e0', scales: 0.08 },
        { back: '#1b1b24', belly: '#3d3748', spots: { color: '#d4a017', density: 14, size: 0.3 }, fin: '#2b2733', tailStart: -0.25, sheen: '#a8b0ff', scales: 0.1 },
        { back: '#ffcf33', belly: '#fff1b8', fin: '#ffe27a', tailStart: -0.25, sheen: '#fffbd0', scales: 0.09 },
    ],
    tang: [
        { back: '#ffd400', belly: '#ffe866', fin: '#ffe14d', tailStart: -0.34, sheen: '#fffbd0', scales: 0.03 },
        { back: '#5b2fc4', belly: '#8f6cf0', fin: '#4a23a8', tailStart: -0.34, sheen: '#e0d4ff', scales: 0.03 },
        { back: '#e8e2d0', belly: '#fffaf0', stripe: { color: '#ff7a00', y: 0.1, width: 0.25 }, fin: '#ff9a3c', tailStart: -0.34, sheen: '#ffffff', scales: 0.03 },
    ],
    trout: [
        { back: '#5d6f2c', belly: '#eef3f5', stripe: { color: '#ff6b93', y: -0.05, width: 0.3 }, spots: { color: '#1f2419', density: 30, size: 0.28 }, fin: '#9aa26a', tailStart: -0.36, sheen: '#c9f3ff', scales: 0.08 },
        { back: '#2f4a3a', belly: '#ff8a3d', spots: { color: '#ffd166', density: 28, size: 0.28 }, fin: '#e2572b', tailStart: -0.36, sheen: '#d4ffe8', scales: 0.08 },
        { back: '#c28b12', belly: '#ffe08a', stripe: { color: '#ff5d5d', y: -0.05, width: 0.25 }, spots: { color: '#3a2a10', density: 24, size: 0.26 }, fin: '#ffb000', tailStart: -0.36, sheen: '#fff2c4', scales: 0.08 },
    ],
    squid: [
        { back: '#c2407a', belly: '#ffd1e0', spots: { color: '#7a1446', density: 24, size: 0.34, pulse: true }, fin: '#ffb0cc', tailStart: -0.05, sheen: '#ffd6ff', scales: 0 },
        { back: '#1e3a8a', belly: '#60a5fa', spots: { color: '#7df9ff', density: 26, size: 0.3, pulse: true }, fin: '#93c5fd', tailStart: -0.05, sheen: '#a5f3fc', scales: 0 },
        { back: '#d97745', belly: '#fde2c8', spots: { color: '#8a3b12', density: 22, size: 0.34, pulse: true }, fin: '#fbbf8a', tailStart: -0.05, sheen: '#ffe8d0', scales: 0 },
    ],
    hammerhead: [
        { back: '#687985', belly: '#f1f5f5', bars: { color: '#56636d', count: 5, strength: 0.25 }, fin: '#56636d', tailStart: -0.38, sheen: '#c4e8ff', scales: 0.02 },
        { back: '#8a6a3c', belly: '#f3eadb', bars: { color: '#6f5430', count: 4, strength: 0.2 }, fin: '#6f5430', tailStart: -0.38, sheen: '#ffe6b3', scales: 0.02 },
    ],
    goblin: [
        { back: '#d0909b', belly: '#f7e0e3', fin: '#b8727f', tailStart: -0.38, sheen: '#ffe0ea', scales: 0.02 },
        { back: '#9fb0bb', belly: '#eef3f6', fin: '#8795a0', tailStart: -0.38, sheen: '#dff6ff', scales: 0.02 },
    ],
};

/** Power fish are painted in their power's colour so you know what you're chasing. */
export const POWER_SKINS: Record<PowerKind, FishSkin> = {
    speed: { back: '#00b4ff', belly: '#b8f6ff', stripe: { color: '#ffffff', y: 0, width: 0.18 }, fin: '#7df9ff', tailStart: -0.3, sheen: '#ffffff', scales: 0.05 },
    shield: { back: '#d9d4ff', belly: '#ffffff', spots: { color: '#ffd6fb', density: 18, size: 0.3 }, fin: '#fff5c2', tailStart: -0.3, sheen: '#ffffff', scales: 0.05 },
    bite: { back: '#e0149e', belly: '#ffb8f0', bars: { color: '#6b0a52', count: 4, strength: 0.6 }, fin: '#ff5cf0', tailStart: -0.3, sheen: '#ffffff', scales: 0.05 },
};
