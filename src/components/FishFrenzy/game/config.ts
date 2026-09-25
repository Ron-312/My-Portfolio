// Tunables and species data for Fish Frenzy. Sizes are abstract "size units";
// a fish's body length in world units is size * LENGTH_PER_SIZE, so what you
// see on screen matches the who-eats-whom rules.

export type Axis = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';

export interface SwimParams {
    freq: number;   // waves along the body (radians per body length)
    speed: number;  // wave speed in radians per second at cruising speed
    amp: number;    // tail sway as a fraction of body length
}

export interface Species {
    id: string;
    name: string;
    emoji: string;
    modelPath: string;
    head: Axis;       // model axis the head points along (after baking node transforms)
    up: Axis;         // model axis the back/dorsal fin points along
    minSize: number;
    maxSize: number;
    speed: number;    // cruising speed, world units per second
    swim: SwimParams;
    hitRadius: number; // collision radius as a fraction of body length
}

export const LENGTH_PER_SIZE = 0.9;
export const EAT_RATIO = 1.1;          // must be 10% bigger to eat (or be eaten)
export const PLAYER_START_SIZE = 1.5;
export const INVULNERABLE_SECONDS = 3;

export const WORLD = {
    halfWidth: 38,   // x and z extent
    floorY: -10,
    surfaceY: 14,
};

export const PLAYER = {
    modelPath: '/gameModels/13007_Blue-Green_Reef_Chromis_v2_l3.glb',
    head: '-y' as Axis,
    up: '+z' as Axis,
    swim: { freq: 7, speed: 11, amp: 0.085 },
    hitRadius: 0.26,
    turnRate: 2.2,      // radians per second
    maxPitch: 1.2,
    baseSpeed: 3.2,     // world units per second, plus a bit per size unit
    speedPerSize: 0.35,
    sprintMultiplier: 1.55,
};

// Sorted by size: unlock order follows this list.
export const SPECIES: Species[] = [
    {
        id: 'clownfish',
        name: 'Clownfish',
        emoji: '🤡',
        modelPath: '/gameModels/13007_Blue-Green_Reef_Chromis_v2_l3.glb',
        head: '-y', up: '+z',
        minSize: 0.45, maxSize: 0.75,
        speed: 1.4,
        swim: { freq: 7, speed: 12, amp: 0.09 },
        hitRadius: 0.3,
    },
    {
        id: 'goldfish',
        name: 'Black Moor Goldfish',
        emoji: '🐟',
        modelPath: '/gameModels/12990_Black_Moor_Goldfish_v1_l2.glb',
        head: '+x', up: '+z',
        minSize: 0.6, maxSize: 1.0,
        speed: 1.3,
        swim: { freq: 6, speed: 9, amp: 0.085 },
        hitRadius: 0.32,
    },
    {
        id: 'tang',
        name: 'Tang',
        emoji: '🐡',
        modelPath: '/gameModels/13007_Blue-Green_Reef_Chromis_v2_l3.glb',
        head: '-y', up: '+z',
        minSize: 0.9, maxSize: 1.3,
        speed: 1.6,
        swim: { freq: 7, speed: 10, amp: 0.085 },
        hitRadius: 0.3,
    },
    {
        id: 'trout',
        name: 'Rainbow Trout',
        emoji: '🐠',
        modelPath: '/gameModels/21859_Rainbow_Trout_v1.glb',
        head: '-x', up: '+z',
        minSize: 1.2, maxSize: 1.8,
        speed: 1.8,
        swim: { freq: 6, speed: 8, amp: 0.085 },
        hitRadius: 0.24,
    },
    {
        id: 'squid',
        name: 'Squid',
        emoji: '🦑',
        modelPath: '/gameModels/11097_squid_v1.glb',
        head: '+y', up: '+z',
        minSize: 2.0, maxSize: 3.0,
        speed: 1.6,
        swim: { freq: 5, speed: 5, amp: 0.1 },
        hitRadius: 0.22,
    },
    {
        id: 'hammerhead',
        name: 'Hammerhead Shark',
        emoji: '🦈',
        modelPath: '/gameModels/19412_Hammerhead_Shark_v2.glb',
        head: '+x', up: '+z',
        minSize: 3.5, maxSize: 5.5,
        speed: 2.1,
        swim: { freq: 4, speed: 5, amp: 0.08 },
        hitRadius: 0.2,
    },
    {
        id: 'goblin',
        name: 'Goblin Shark',
        emoji: '👹',
        modelPath: '/gameModels/21861_Goblin_Shark_v1.glb',
        head: '-x', up: '+z',
        minSize: 6.0, maxSize: 9.0,
        speed: 1.9,
        swim: { freq: 3.5, speed: 4, amp: 0.07 },
        hitRadius: 0.18,
    },
];

// ───────────── power-ups ─────────────
// Rare, fast, sparkling fish. They're always edible but bolt away from you, so
// you have to sprint to catch one.

export type PowerKind = 'speed' | 'shield' | 'bite';

export interface PowerUp {
    kind: PowerKind;
    name: string;
    emoji: string;
    color: string;
    description: string;
}

export const POWER_UPS: Record<PowerKind, PowerUp> = {
    speed: { kind: 'speed', name: 'Speed boost', emoji: '⚡', color: '#22d3ff', description: 'Swim 50% faster for 8 seconds' },
    shield: { kind: 'shield', name: 'Shield', emoji: '🛡️', color: '#f4f1ff', description: 'Survive one bite from a bigger fish' },
    bite: { kind: 'bite', name: 'Mega bite', emoji: '🦷', color: '#ff3df2', description: 'Your next bigger fish becomes a meal' },
};

export const SPEED_BOOST = { seconds: 8, multiplier: 1.5 };
export const MAX_POWER_CHARGES = 2;       // shields / mega bites you can hold at once
export const POWER_POINTS = 25;

export const POWER_FISH = {
    lifetime: 25,                  // seconds before an uneaten one swims off
    respawn: [10, 18] as const,    // seconds between appearances
    fleeSpeed: 4.4,                // faster than you cruise, slower than you sprint
    fleeRadius: 10,
};

/** The sleek trout body, shrunk down and painted bright; see POWER_SKINS. */
export const POWER_SPECIES: Species = {
    id: 'power',
    name: 'Power fish',
    emoji: '✨',
    modelPath: '/gameModels/21859_Rainbow_Trout_v1.glb',
    head: '-x', up: '+z',
    minSize: 0.5, maxSize: 0.65,
    speed: 3.0,
    swim: { freq: 7, speed: 16, amp: 0.1 },
    hitRadius: 0.34,
};

export const CORALS = {
    tree: '/gameModels/21488_Tree_Coral_v2_NEW.glb',
    fan: '/gameModels/underwater_enviro_coral.glb',
};

export const ALL_MODEL_PATHS = [...new Set([
    PLAYER.modelPath,
    ...SPECIES.map(s => s.modelPath),
    POWER_SPECIES.modelPath,
    CORALS.tree,
    CORALS.fan,
])];

/** Size the player must exceed before some of this species becomes edible. */
export const unlockSize = (s: Species) => s.minSize * EAT_RATIO;

/** Species the player can't eat any of yet (the next one is the next goal). */
export function nextUnlock(playerSize: number): Species | undefined {
    return SPECIES.find(s => playerSize <= unlockSize(s));
}

/** How much the player grows after eating a fish of `eatenSize` (capped, so a mega bite can't triple you). */
export const growthFor = (playerSize: number, eatenSize: number) =>
    Math.min((eatenSize * eatenSize) / playerSize * 0.12, playerSize * 0.3);

/** Points for eating a fish; risky meals close to your own size score double. */
export const pointsFor = (playerSize: number, eatenSize: number) =>
    Math.round(eatenSize * 10 * (eatenSize > playerSize * 0.8 ? 2 : 1));
