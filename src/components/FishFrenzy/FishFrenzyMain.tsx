"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import JoystickControl from './JoystickControl';
import { HudButton, Overlay, PrimaryButton, StatsPanel, ToastBanner, type Toast } from './Hud';
import { useFullscreen } from './useFullscreen';
import { FishFrenzyGame, type GameInput, type PowerState } from './game/engine';
import { preloadModels } from './game/models';
import { Sfx } from './game/audio';
import { ALL_MODEL_PATHS, PLAYER_START_SIZE } from './game/config';

interface FishFrenzyProps {
    height?: string;
}

type Phase = 'menu' | 'loading' | 'playing' | 'paused' | 'over' | 'error';

const NO_POWERS: PowerState = { speed: 0, shields: 0, bites: 0 };
const HIGH_SCORE_KEY = 'fishFrenzy.highScore';
const MUTED_KEY = 'fishFrenzy.muted';
const STEER_KEYS = new Set(['w', 'a', 's', 'd', 'shift']);
const KEY_ALIASES: Record<string, string> = {
    arrowup: 'w', arrowdown: 's', arrowleft: 'a', arrowright: 'd',
};

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

export default function FishFrenzy({ height = "h-96" }: FishFrenzyProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const minimapRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<FishFrenzyGame | null>(null);
    const input = useRef<GameInput>({ keys: {}, stickX: 0, stickY: 0 });
    const sfx = useRef<Sfx | null>(null);
    const highScoreRef = useRef(0);

    const [phase, setPhase] = useState<Phase>('menu');
    const [runId, setRunId] = useState(0);
    const [progress, setProgress] = useState(0);
    const [score, setScore] = useState(0);
    const [size, setSize] = useState(PLAYER_START_SIZE);
    const [highScore, setHighScore] = useState(0);
    const [newBest, setNewBest] = useState(false);
    const [toast, setToast] = useState<Toast | null>(null);
    const [powers, setPowers] = useState<PowerState>(NO_POWERS);
    const [muted, setMuted] = useState(false);
    const [touch, setTouch] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef, isIOS);
    const inGame = phase === 'playing' || phase === 'paused';

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
    useEffect(() => {
        if (!inGame) return;
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
            if (STEER_KEYS.has(k)) {
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
    }, [inGame, togglePause]);

    return (
        <div
            ref={containerRef}
            className={`@container relative w-full select-none overflow-hidden rounded-lg bg-[#0a6a9a]
                ${isIOS && isFullscreen ? 'fixed inset-0 z-[1000] h-[100dvh] rounded-none' : height}`}
        >
            {inGame && <StatsPanel score={score} best={Math.max(highScore, score)} size={size} powers={powers} />}

            {/* Controls + minimap (the canvas stays mounted so the engine can draw into it) */}
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

            {toast && inGame && <ToastBanner toast={toast} />}

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
    );
}
