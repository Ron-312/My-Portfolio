import { useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import type { GameInput } from './game/engine';

interface JoystickProps {
    input: RefObject<GameInput>;
    visible: boolean;
}

const MAX_RADIUS = 44;
const DEAD_ZONE = 0.12;

/** Analog steering stick (bottom-left) and a hold-to-sprint button (bottom-right) for touch screens. */
export default function JoystickControl({ input, visible }: JoystickProps) {
    const [knob, setKnob] = useState({ x: 0, y: 0 });
    const [active, setActive] = useState(false);
    const [sprinting, setSprinting] = useState(false);
    const baseRef = useRef<HTMLDivElement>(null);

    const release = () => {
        setActive(false);
        setKnob({ x: 0, y: 0 });
        input.current.stickX = 0;
        input.current.stickY = 0;
    };

    const setSprint = (on: boolean) => {
        setSprinting(on);
        input.current.keys.shift = on;
    };

    // Never leave the fish steering or sprinting after the controls disappear.
    useEffect(() => {
        const current = input.current;
        return () => {
            current.stickX = 0;
            current.stickY = 0;
            current.keys.shift = false;
            setActive(false);
            setSprinting(false);
            setKnob({ x: 0, y: 0 });
        };
    }, [visible, input]);

    const move = (e: PointerEvent<HTMLDivElement>) => {
        const rect = baseRef.current?.getBoundingClientRect();
        if (!rect) return;
        let dx = e.clientX - (rect.left + rect.width / 2);
        let dy = e.clientY - (rect.top + rect.height / 2);
        const distance = Math.hypot(dx, dy);
        if (distance > MAX_RADIUS) {
            dx *= MAX_RADIUS / distance;
            dy *= MAX_RADIUS / distance;
        }
        setKnob({ x: dx, y: dy });
        const scaled = (v: number) => {
            const n = v / MAX_RADIUS;
            return Math.abs(n) < DEAD_ZONE ? 0 : (n - Math.sign(n) * DEAD_ZONE) / (1 - DEAD_ZONE);
        };
        input.current.stickX = scaled(dx);
        input.current.stickY = -scaled(dy);
    };

    if (!visible) return null;

    return (
        <>
            <div
                ref={baseRef}
                className={`absolute bottom-4 left-4 z-40 h-28 w-28 rounded-full border-4 bg-black/40 backdrop-blur-sm transition-colors
                    ${active ? 'border-cyan-300' : 'border-white/50'}`}
                style={{ touchAction: 'none' }}
                onPointerDown={e => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setActive(true);
                    move(e);
                }}
                onPointerMove={e => active && move(e)}
                onPointerUp={release}
                onPointerCancel={release}
                aria-label="Steering joystick"
            >
                <div
                    className={`pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-lg
                        ${active ? 'bg-cyan-400' : 'bg-cyan-500/80'}`}
                    style={{ marginLeft: knob.x, marginTop: knob.y }}
                />
            </div>

            <button
                type="button"
                className={`absolute bottom-6 right-4 z-40 flex h-20 w-20 items-center justify-center rounded-full border-4 text-white transition-colors
                    ${sprinting ? 'border-cyan-300 bg-cyan-600' : 'border-white/50 bg-black/40 backdrop-blur-sm'}`}
                style={{ touchAction: 'none' }}
                onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setSprint(true); }}
                onPointerUp={() => setSprint(false)}
                onPointerCancel={() => setSprint(false)}
                aria-label="Sprint"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            </button>
        </>
    );
}
