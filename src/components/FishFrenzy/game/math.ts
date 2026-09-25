// Small numeric helpers shared by the game modules.

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const randomIn = (min: number, max: number) => min + Math.random() * (max - min);

export const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];

/** Wraps an angle into (-π, π], so turning always takes the short way round. */
export const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Frame-rate independent smoothing factor for lerping toward a target at `rate` per second. */
export const approach = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
