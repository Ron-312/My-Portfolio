"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import JoystickControl from './JoystickControl';
import { FishFrenzyGame, type GameInput, type PowerState } from './game/engine';
import { preloadModels } from './game/models';
import { Sfx } from './game/audio';
import { CATEGORY_COLORS } from './game/minimap';
import {
    ALL_MODEL_PATHS, PLAYER_START_SIZE, POWER_UPS, SPECIES, nextUnlock, unlockSize,
} from './game/config';

interface FishFrenzyProps {
    height?: string;
}

type Phase = 'menu' | 'loading' | 'playing' | 'paused' | 'over' | 'error';

interface Toast {
    kicker: string;
    title: string;
    color: string;
}

const NO_POWERS: PowerState = { speed: 0, shields: 0, bites: 0 };

interface FullscreenElement extends HTMLDivElement {
    webkitRequestFullscreen?: () => Promise<void>;
}

interface FullscreenDocument extends Document {
    webkitExitFullscreen?: () => Promise<void>;
    webkitFullscreenElement?: Element | null;
}

const HIGH_SCORE_KEY = 'fishFrenzy.highScore';
const MUTED_KEY = 'fishFrenzy.muted';

function readStorage(key: string) {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

function writeStorage(key: string, value: string) {
    try {
        window.localStorage.setItem(key, value);
    } catch {
        // Private mode or blocked storage: the game still works, it just forgets.
    }
}

const KEY_ALIASES: Record<string, string> = {
    arrowup: 'w', arrowdown: 's', arrowleft: 'a', arrowright: 'd',
};

export default function FishFrenzy({ height = "h-96" }: FishFrenzyProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const minimapRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<FishFrenzyGame | null>(null);
    const input = useRef<GameInput>({ keys: {}, stickX: 0, stickY: 0 });
    const sfx = useRef<Sfx | null>(null);

    const [phase, setPhase] = useState<Phase>('menu');
    const [runId, setRunId] = useState(0);
    const [progress, setProgress] = useState(0);
    const [score, setScore] = useState(0);
    const [size, setSize] = useState(PLAYER_START_SIZE);
    const [highScore, setHighScore] = useState(0);
    const highScoreRef = useRef(0);
    const [newBest, setNewBest] = useState(false);
    const [toast, setToast] = useState<Toast | null>(null);
    const [powers, setPowers] = useState<PowerState>(NO_POWERS);
    const [muted, setMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [touch, setTouch] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    // Browser-only setup (the portfolio is statically exported, so no window during build).
    useEffect(() => {
        highScoreRef.current = Number(readStorage(HIGH_SCORE_KEY)) || 0;
        setHighScore(highScoreRef.current);
        const savedMute = readStorage(MUTED_KEY) === '1';
        setMuted(savedMute);
        sfx.current = new Sfx();
        sfx.current.muted = savedMute;
        setTouch(window.matchMedia('(pointer: coarse)').matches);
        setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
        return () => sfx.current?.dispose();
    }, []);

    // ───────────── game lifecycle: one engine per run ─────────────
    useEffect(() => {
        if (runId === 0 || !containerRef.current) return;
        let cancelled = false;
        let game: FishFrenzyGame | null = null;

        setScore(0);
        setSize(PLAYER_START_SIZE);
        setNewBest(false);
        setToast(null);
        setPowers(NO_POWERS);
        setPhase('loading');

        (async () => {
            try {
                await preloadModels(ALL_MODEL_PATHS, setProgress);
                if (cancelled) return;
                game = await FishFrenzyGame.create({
                    container: containerRef.current!,
                    minimap: minimapRef.current,
                    input,
                    sfx: sfx.current!,
                    mobile: window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 600,
                    events: {
                        onStats: (s, sz) => { setScore(s); setSize(sz); },
                        onUnlock: species => setToast({
                            kicker: 'Level up',
                            title: `${species.emoji} ${species.name} are on the menu!`,
                            color: '#67e8f9',
                        }),
                        onPowerUp: power => setToast({
                            kicker: `${power.emoji} ${power.name}`,
                            title: power.description,
                            color: power.color,
                        }),
                        onPowers: setPowers,
                        onPauseChange: paused => setPhase(paused ? 'paused' : 'playing'),
                        onGameOver: finalScore => {
                            setPhase('over');
                            if (finalScore > highScoreRef.current) {
                                highScoreRef.current = finalScore;
                                writeStorage(HIGH_SCORE_KEY, String(finalScore));
                                setHighScore(finalScore);
                                setNewBest(true);
                            }
                        },
                    },
                });
                if (cancelled) {
                    game.dispose();
                    return;
                }
                gameRef.current = game;
                game.start();
                setPhase('playing');
            } catch (err) {
                console.error('Fish Frenzy failed to start:', err);
                if (!cancelled) setPhase('error');
            }
        })();

        return () => {
            cancelled = true;
            game?.dispose();
            gameRef.current = null;
        };
    }, [runId]);

    const startRun = () => {
        sfx.current?.unlock(); // audio must be started from a user gesture
        setRunId(id => id + 1);
    };

    const togglePause = useCallback(() => {
        const game = gameRef.current;
        if (game) game.setPaused(!game.isPaused);
    }, []);

    const toggleMute = () => {
        const next = !muted;
        setMuted(next);
        if (sfx.current) sfx.current.muted = next;
        writeStorage(MUTED_KEY, next ? '1' : '0');
    };

    // Toasts fade on their own.
    useEffect(() => {
        if (!toast) return;
        const id = setTimeout(() => setToast(null), 2800);
        return () => clearTimeout(id);
    }, [toast]);

    // ───────────── keyboard ─────────────
    const active = phase === 'playing' || phase === 'paused';
    useEffect(() => {
        if (!active) return;
        const keys = input.current.keys;
        const keyName = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            return KEY_ALIASES[k] ?? k;
        };
        const onDown = (e: KeyboardEvent) => {
            const k = keyName(e);
            if (k === 'p') {
                togglePause();
                return;
            }
            if (['w', 'a', 's', 'd', 'shift'].includes(k)) {
                keys[k] = true;
                // Stop arrow keys from scrolling the portfolio page while playing.
                if (e.key.startsWith('Arrow')) e.preventDefault();
            }
        };
        const onUp = (e: KeyboardEvent) => {
            keys[keyName(e)] = false;
        };
        const clearKeys = () => {
            for (const k of Object.keys(keys)) keys[k] = false;
        };
        window.addEventListener('keydown', onDown);
        window.addEventListener('keyup', onUp);
        window.addEventListener('blur', clearKeys);
        return () => {
            window.removeEventListener('keydown', onDown);
            window.removeEventListener('keyup', onUp);
            window.removeEventListener('blur', clearKeys);
            clearKeys();
        };
    }, [active, togglePause]);

    // ───────────── fullscreen ─────────────
    useEffect(() => {
        const onChange = () => {
            const doc = document as FullscreenDocument;
            setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement));
        };
        document.addEventListener('fullscreenchange', onChange);
        document.addEventListener('webkitfullscreenchange', onChange);
        return () => {
            document.removeEventListener('fullscreenchange', onChange);
            document.removeEventListener('webkitfullscreenchange', onChange);
        };
    }, []);

    const toggleFullscreen = () => {
        const el = containerRef.current as FullscreenElement | null;
        if (!el) return;
        // iPhone Safari ignores the Fullscreen API, so fake it with a fixed overlay.
        if (isIOS || !(el.requestFullscreen || el.webkitRequestFullscreen)) {
            setIsFullscreen(v => !v);
            return;
        }
        const doc = document as FullscreenDocument;
        if (doc.fullscreenElement || doc.webkitFullscreenElement) {
            void (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
        } else {
            void (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.());
        }
    };

    // ───────────── HUD data ─────────────
    const next = nextUnlock(size);
    const previousThreshold = [...SPECIES].reverse().find(s => size > unlockSize(s));
    const from = previousThreshold ? unlockSize(previousThreshold) : PLAYER_START_SIZE;
    const toNext = next ? Math.min(1, Math.max(0, (size - from) / (unlockSize(next) - from))) : 1;
    const inGame = phase === 'playing' || phase === 'paused';

    return (
        <div className="relative w-full">
            <div
                ref={containerRef}
                className={`@container relative w-full overflow-hidden rounded-lg bg-[#0569a0] select-none
                    ${isIOS && isFullscreen ? 'fixed inset-0 z-[1000] h-[100dvh] rounded-none' : height}`}
            >
                {/* HUD: score, growth, legend */}
                {inGame && (
                    <div className="pointer-events-none absolute left-2 top-2 z-30 w-32 rounded-lg bg-black/45 px-2.5 py-1.5 text-left text-white backdrop-blur-sm @sm:left-3 @sm:top-3 @sm:w-52 @sm:px-3 @sm:py-2">
                        <div className="flex items-baseline justify-between">
                            <span className="text-base font-bold tabular-nums @sm:text-lg">{score}</span>
                            <span className="text-[11px] text-white/70">Best {Math.max(highScore, score)}</span>
                        </div>
                        <div className="text-xs text-white/80">Size {size.toFixed(2)}</div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                            <div className="h-full rounded-full bg-cyan-300 transition-[width] duration-300" style={{ width: `${toNext * 100}%` }} />
                        </div>
                        <div className="mt-1 text-[10px] leading-tight text-white/80 @sm:text-[11px]">
                            {next ? <>Next: {next.emoji} {next.name} at {unlockSize(next).toFixed(1)}</> : <>👑 Apex predator!</>}
                        </div>
                        <div className="mt-1.5 hidden gap-2 text-[10px] text-white/85 @sm:flex">
                            <span className="text-white/60">Glow:</span>
                            <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS.edible }} />eat</span>
                            <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS.neutral }} />bump</span>
                            <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS.danger }} />run!</span>
                        </div>
                        {(powers.speed > 0 || powers.shields > 0 || powers.bites > 0) && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {powers.speed > 0 && <PowerChip color={POWER_UPS.speed.color}>{POWER_UPS.speed.emoji} {powers.speed}s</PowerChip>}
                                {powers.shields > 0 && <PowerChip color={POWER_UPS.shield.color}>{POWER_UPS.shield.emoji} ×{powers.shields}</PowerChip>}
                                {powers.bites > 0 && <PowerChip color={POWER_UPS.bite.color}>{POWER_UPS.bite.emoji} ×{powers.bites}</PowerChip>}
                            </div>
                        )}
                    </div>
                )}

                {/* Controls + minimap */}
                <div className={`absolute right-2 top-2 z-30 flex flex-col items-end gap-1.5 @sm:right-3 @sm:top-3 @sm:gap-2 ${inGame ? '' : 'hidden'}`}>
                    <div className="flex gap-1 @sm:gap-1.5">
                        <HudButton onClick={toggleMute} label={muted ? 'Unmute' : 'Mute'}>
                            {muted ? (
                                <path d="M11 5 6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
                            ) : (
                                <path d="M11 5 6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
                            )}
                        </HudButton>
                        <HudButton onClick={togglePause} label={phase === 'paused' ? 'Resume' : 'Pause'}>
                            {phase === 'paused' ? <path d="m6 4 14 8-14 8V4z" /> : <path d="M6 4h4v16H6zM14 4h4v16h-4z" />}
                        </HudButton>
                        <HudButton onClick={toggleFullscreen} label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
                            {isFullscreen ? (
                                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                            ) : (
                                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                            )}
                        </HudButton>
                    </div>
                    <canvas ref={minimapRef} className="h-16 w-16 @sm:h-24 @sm:w-24 @lg:h-28 @lg:w-28" aria-label="Minimap" />
                </div>

                {/* Species unlocked / power-up collected */}
                {toast && inGame && (
                    <div className="pointer-events-none absolute inset-x-0 top-1/4 z-30 flex justify-center">
                        <div className="mx-3 animate-bounce rounded-xl bg-black/60 px-4 py-2.5 text-center text-white shadow-xl backdrop-blur-sm">
                            <div className="text-xs uppercase tracking-widest" style={{ color: toast.color }}>{toast.kicker}</div>
                            <div className="text-sm font-bold @sm:text-lg">{toast.title}</div>
                        </div>
                    </div>
                )}

                {phase === 'menu' && (
                    <Overlay>
                        <h2 className="mb-2 text-3xl font-bold text-cyan-300">Fish Frenzy</h2>
                        <p className="mb-3 max-w-md px-4 text-white">
                            Eat smaller fish to grow, dodge the big ones, and work your way up to goblin sharks.
                            Fish glowing <span className="font-semibold text-green-400">green</span> are food,{' '}
                            <span className="font-semibold text-red-400">red</span> ones are hungry.
                            Chase down the rare sparkling fish for ⚡ speed, 🛡️ shields and 🦷 mega bites!
                        </p>
                        <p className="mb-4 max-w-md px-4 text-sm text-white/75">
                            {touch
                                ? 'Steer with the stick, hold ⚡ to sprint.'
                                : 'Arrows / WASD to steer · Shift to sprint · P to pause'}
                        </p>
                        {highScore > 0 && <p className="mb-3 text-sm text-white/75">Best: {highScore}</p>}
                        <PrimaryButton onClick={startRun}>Start Game</PrimaryButton>
                    </Overlay>
                )}

                {phase === 'loading' && (
                    <Overlay>
                        <p className="mb-3 text-white">Filling the ocean… {Math.round(progress * 100)}%</p>
                        <div className="h-2 w-48 overflow-hidden rounded-full bg-white/20">
                            <div className="h-full bg-cyan-300 transition-[width]" style={{ width: `${progress * 100}%` }} />
                        </div>
                    </Overlay>
                )}

                {phase === 'paused' && (
                    <Overlay>
                        <h2 className="mb-4 text-3xl font-bold text-white">Paused</h2>
                        <PrimaryButton onClick={togglePause}>Resume</PrimaryButton>
                    </Overlay>
                )}

                {phase === 'over' && (
                    <Overlay>
                        <h2 className="mb-2 text-3xl font-bold text-red-400">Eaten!</h2>
                        {newBest && <p className="mb-1 font-semibold text-yellow-300">🏆 New high score!</p>}
                        <p className="mb-1 text-white">Score: {score}</p>
                        <p className="mb-4 text-white/75">Best: {highScore} · Size reached: {size.toFixed(2)}</p>
                        <PrimaryButton onClick={startRun}>Play Again</PrimaryButton>
                        {isFullscreen && (
                            <button onClick={toggleFullscreen} className="mt-2 rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700">
                                Exit Fullscreen
                            </button>
                        )}
                    </Overlay>
                )}

                {phase === 'error' && (
                    <Overlay>
                        <p className="mb-4 text-white">The fish didn&apos;t load. Check your connection and try again.</p>
                        <PrimaryButton onClick={startRun}>Retry</PrimaryButton>
                    </Overlay>
                )}

                <JoystickControl input={input} visible={touch && phase === 'playing'} />
            </div>

        </div>
    );
}

function Overlay({ children }: { children: React.ReactNode }) {
    return (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 text-center backdrop-blur-[2px]">
            {children}
        </div>
    );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
    return (
        <button onClick={onClick} className="rounded-lg bg-cyan-500 px-5 py-2 font-semibold text-white shadow-md transition-colors hover:bg-cyan-600">
            {children}
        </button>
    );
}

function PowerChip({ color, children }: { color: string; children: React.ReactNode }) {
    return (
        <div
            className="rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white"
            style={{ boxShadow: `0 0 0 2px ${color}, 0 0 12px ${color}` }}
        >
            {children}
        </div>
    );
}

function HudButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
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
