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

export const SPECIES_SKINS: Record<string, FishSkin> = {
    goldfish: {
        back: '#ff6a13',
        belly: '#ffd98a',
        spots: { color: '#fff4e6', density: 16, size: 0.36 },
        fin: '#ffb347',
        tailStart: -0.25,
        sheen: '#fff0b3',
        scales: 0.09,
    },
    trout: {
        back: '#5d6f2c',
        belly: '#eef3f5',
        stripe: { color: '#ff6b93', y: -0.05, width: 0.3 },
        spots: { color: '#1f2419', density: 30, size: 0.28 },
        fin: '#9aa26a',
        tailStart: -0.36,
        sheen: '#c9f3ff',
        scales: 0.08,
    },
    squid: {
        back: '#c2407a',
        belly: '#ffd1e0',
        spots: { color: '#7a1446', density: 24, size: 0.34, pulse: true },
        fin: '#ffb0cc',
        tailStart: -0.05,   // tentacles
        sheen: '#ffd6ff',
        scales: 0,
    },
    hammerhead: {
        back: '#687985',
        belly: '#f1f5f5',
        bars: { color: '#56636d', count: 5, strength: 0.25 },
        fin: '#56636d',
        tailStart: -0.38,
        sheen: '#c4e8ff',
        scales: 0.02,
    },
    goblin: {
        back: '#d0909b',
        belly: '#f7e0e3',
        fin: '#b8727f',
        tailStart: -0.38,
        sheen: '#ffe0ea',
        scales: 0.02,
    },
};
