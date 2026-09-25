import type { ReactNode } from 'react';
import { POWER_UPS, unlockProgress, unlockSize } from './game/config';
import { CATEGORY_COLORS } from './game/minimap';
import type { PowerState } from './game/engine';

// Presentational pieces of the Fish Frenzy UI: the stats panel, banners,
// buttons and full-screen overlays. All state lives in FishFrenzyMain.

export interface Toast {
    kicker: string;
    title: string;
    color: string;
}

interface StatsPanelProps {
    score: number;
    best: number;
    size: number;
    powers: PowerState;
}

/** Score, growth toward the next species, the glow legend and active power-ups. */
export function StatsPanel({ score, best, size, powers }: StatsPanelProps) {
    const { next, fraction } = unlockProgress(size);
    const hasPowers = powers.speed > 0 || powers.shields > 0 || powers.bites > 0;

    return (
        <div className="pointer-events-none absolute left-2 top-2 z-30 w-32 rounded-lg bg-black/45 px-2.5 py-1.5 text-left text-white backdrop-blur-sm @sm:left-3 @sm:top-3 @sm:w-52 @sm:px-3 @sm:py-2">
            <div className="flex items-baseline justify-between">
                <span className="text-base font-bold tabular-nums @sm:text-lg">{score}</span>
                <span className="text-[11px] text-white/70">Best {best}</span>
            </div>
            <div className="text-xs text-white/80">Size {size.toFixed(2)}</div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-cyan-300 transition-[width] duration-300" style={{ width: `${fraction * 100}%` }} />
            </div>
            <div className="mt-1 text-[10px] leading-tight text-white/80 @sm:text-[11px]">
                {next ? <>Next: {next.emoji} {next.name} at {unlockSize(next).toFixed(1)}</> : <>👑 Apex predator!</>}
            </div>
            <div className="mt-1.5 hidden gap-2 text-[10px] text-white/85 @sm:flex">
                <span className="text-white/60">Glow:</span>
                <LegendDot color={CATEGORY_COLORS.edible}>eat</LegendDot>
                <LegendDot color={CATEGORY_COLORS.neutral}>bump</LegendDot>
                <LegendDot color={CATEGORY_COLORS.danger}>run!</LegendDot>
            </div>
            {hasPowers && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {powers.speed > 0 && <PowerChip color={POWER_UPS.speed.color}>{POWER_UPS.speed.emoji} {powers.speed}s</PowerChip>}
                    {powers.shields > 0 && <PowerChip color={POWER_UPS.shield.color}>{POWER_UPS.shield.emoji} ×{powers.shields}</PowerChip>}
                    {powers.bites > 0 && <PowerChip color={POWER_UPS.bite.color}>{POWER_UPS.bite.emoji} ×{powers.bites}</PowerChip>}
                </div>
            )}
        </div>
    );
}

function LegendDot({ color, children }: { color: string; children: ReactNode }) {
    return (
        <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: color }} />
            {children}
        </span>
    );
}

function PowerChip({ color, children }: { color: string; children: ReactNode }) {
    return (
        <div
            className="rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white"
            style={{ boxShadow: `0 0 0 2px ${color}, 0 0 12px ${color}` }}
        >
            {children}
        </div>
    );
}

/** A short announcement for level-ups and power-ups. */
export function ToastBanner({ toast }: { toast: Toast }) {
    return (
        <div className="pointer-events-none absolute inset-x-0 top-1/4 z-30 flex justify-center">
            <div className="mx-3 animate-bounce rounded-xl bg-black/60 px-4 py-2.5 text-center text-white shadow-xl backdrop-blur-sm">
                <div className="text-xs uppercase tracking-widest" style={{ color: toast.color }}>{toast.kicker}</div>
                <div className="text-sm font-bold @sm:text-lg">{toast.title}</div>
            </div>
        </div>
    );
}

/** A square icon button; `children` are the SVG paths (24×24 viewBox). */
export function HudButton({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
    return (
        <button
            onClick={onClick}
            aria-label={label}
            title={label}
            className="rounded-lg bg-black/45 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/70 @sm:p-2"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 @sm:h-[18px] @sm:w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {children}
            </svg>
        </button>
    );
}

export function Overlay({ children }: { children: ReactNode }) {
    return (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 text-center backdrop-blur-[2px]">
            {children}
        </div>
    );
}

export function PrimaryButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
    return (
        <button onClick={onClick} className="rounded-lg bg-cyan-500 px-5 py-2 font-semibold text-white shadow-md transition-colors hover:bg-cyan-600">
            {children}
        </button>
    );
}
