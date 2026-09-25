import { WORLD } from './config';

export type Category = 'edible' | 'neutral' | 'danger';

export const CATEGORY_COLORS: Record<Category, string> = {
    edible: '#4ade80',
    neutral: '#fbbf24',
    danger: '#f87171',
};

export interface MapBlip {
    x: number;
    z: number;
    length: number;
    category: Category;
}

/**
 * Top-down map of the whole arena, north (-Z) up. Fish are coloured by
 * whether you can eat them, and the nearest meal gets a ring.
 */
export function drawMinimap(
    canvas: HTMLCanvasElement,
    player: { x: number; z: number; yaw: number },
    fish: MapBlip[],
) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssSize = canvas.clientWidth;
    if (canvas.width !== Math.round(cssSize * dpr)) {
        canvas.width = canvas.height = Math.round(cssSize * dpr);
    }
    const size = canvas.width;
    const pad = 4 * dpr;
    const scale = (size - pad * 2) / (WORLD.halfWidth * 2);
    const cx = size / 2;
    const toPx = (v: number) => cx + v * scale;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(3, 25, 45, 0.6)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = dpr;
    ctx.beginPath();
    ctx.roundRect(pad / 2, pad / 2, size - pad, size - pad, 6 * dpr);
    ctx.fill();
    ctx.stroke();

    let nearest: MapBlip | null = null;
    let nearestDist = Infinity;
    for (const f of fish) {
        ctx.fillStyle = CATEGORY_COLORS[f.category];
        const r = Math.max(1.5 * dpr, Math.min(f.length * scale * 0.5, 5 * dpr));
        ctx.beginPath();
        ctx.arc(toPx(f.x), toPx(f.z), r, 0, Math.PI * 2);
        ctx.fill();
        if (f.category === 'edible') {
            const d = Math.hypot(f.x - player.x, f.z - player.z);
            if (d < nearestDist) { nearestDist = d; nearest = f; }
        }
    }

    if (nearest) {
        ctx.strokeStyle = CATEGORY_COLORS.edible;
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        ctx.arc(toPx(nearest.x), toPx(nearest.z), 5 * dpr, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Player arrow pointing along its heading.
    const px = toPx(player.x), pz = toPx(player.z);
    const angle = Math.atan2(Math.cos(player.yaw), Math.sin(player.yaw));
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(angle);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0891b2';
    ctx.lineWidth = dpr;
    ctx.beginPath();
    ctx.moveTo(6 * dpr, 0);
    ctx.lineTo(-4 * dpr, 4 * dpr);
    ctx.lineTo(-2 * dpr, 0);
    ctx.lineTo(-4 * dpr, -4 * dpr);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}
