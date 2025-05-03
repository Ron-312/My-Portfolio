import { useEffect, useRef, useState } from 'react';

interface JoystickProps {
  keysPressed: React.MutableRefObject<Record<string, boolean>>;
  gameStarted: boolean;
  gameOver: boolean;
  loading: boolean;
}

export default function JoystickControl({
  keysPressed,
  gameStarted,
  gameOver,
  loading
}: JoystickProps) {
  /* ─────────── local state / refs ─────────── */
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPosition, setJoystickPosition] = useState({ x: 0, y: 0 });
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [sprintDown, setSprintDown] = useState(false);
  const sprintRef = useRef(false);

  const joystickAreaRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);
  const isActiveRef = useRef(false);

  /* ─────────── detect mobile once ─────────── */
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    setIsMobileDevice(
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(
        ua
      )
    );
  }, []);

  /* ─────────── reflect sprintDown → keysPressed ─────────── */
  useEffect(() => {
    keysPressed.current['shift'] = sprintDown;
    sprintRef.current = sprintDown;
  }, [sprintDown, keysPressed]);

  /* ─────────── main joystick listeners ─────────── */
  useEffect(() => {
    if (!gameStarted) return;

    const preventScroll = (e: TouchEvent) => {
      if (isActiveRef.current) e.preventDefault();
    };

    /* touch start */
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      const rect = joystickAreaRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (
        touch.clientX >= rect.left &&
        touch.clientX <= rect.right &&
        touch.clientY >= rect.top &&
        touch.clientY <= rect.bottom
      ) {
        touchIdRef.current = touch.identifier;
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
        setJoystickActive(true);
        isActiveRef.current = true;
        setDebugInfo('Touch started in joystick area');
        e.preventDefault();
      }
    };

    /* touch move */
    const handleTouchMove = (e: TouchEvent) => {
      if (!isActiveRef.current || touchIdRef.current === null) return;

      let activeTouch: Touch | null = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchIdRef.current) {
          activeTouch = e.touches[i];
          break;
        }
      }
      if (!activeTouch) return;

      const deltaX = activeTouch.clientX - touchStartRef.current.x;
      const deltaY = activeTouch.clientY - touchStartRef.current.y;
      const distance = Math.hypot(deltaX, deltaY);
      const maxRadius = 50;
      const limitedDist = Math.min(distance, maxRadius);
      const angle = Math.atan2(deltaY, deltaX);
      const normX = Math.cos(angle) * limitedDist / maxRadius;
      const normY = Math.sin(angle) * limitedDist / maxRadius;

      setJoystickPosition({
        x: Math.cos(angle) * limitedDist,
        y: Math.sin(angle) * limitedDist
      });

      const dead = 0.2;
      keysPressed.current['w'] = normY < -dead;
      keysPressed.current['a'] = normX < -dead;
      keysPressed.current['s'] = normY > dead;
      keysPressed.current['d'] = normX > dead;

      setDebugInfo(`X:${normX.toFixed(2)} Y:${normY.toFixed(2)}`);
      e.preventDefault();
    };

    /* touch end / cancel */
    const handleTouchEnd = (e: TouchEvent) => {
      let stillActive = false;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchIdRef.current) {
          stillActive = true;
          break;
        }
      }
      if (!stillActive) {
        touchIdRef.current = null;
        setJoystickActive(false);
        isActiveRef.current = false;
        setJoystickPosition({ x: 0, y: 0 });
        keysPressed.current['w'] = false;
        keysPressed.current['a'] = false;
        keysPressed.current['s'] = false;
        keysPressed.current['d'] = false;
        setDebugInfo('Touch ended');
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);
    document.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
      document.removeEventListener('touchmove', preventScroll);
      // clear keys
      ['w', 'a', 's', 'd', 'shift'].forEach(k => (keysPressed.current[k] = false));
    };
  }, [gameStarted, keysPressed]);

  /* ─────────── render guards ─────────── */
  if (!isMobileDevice || !gameStarted || gameOver || loading) return null;

  /* ─────────── UI ─────────── */
  return (
    <>
      {/* debug read‑out */}
      <div className="fixed top-4 left-4 z-[600] bg-black/70 text-white text-xs px-2 py-1 rounded">
        {debugInfo}
      </div>

      {/* joystick pad (left‑bottom) */}
      <div
        ref={joystickAreaRef}
        className="fixed bottom-0 left-0 w-1/2 h-1/3 z-[500] flex items-center justify-center"
      >
        <div
          className={`w-40 h-40 rounded-full bg-black/70 border-4
            ${joystickActive ? 'border-blue-400' : 'border-white/60'} relative`}
        >
          <div
            className={`w-24 h-24 rounded-full
              ${joystickActive ? 'bg-blue-600' : 'bg-blue-500'}
              absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}
            style={{
              marginLeft: joystickPosition.x,
              marginTop: joystickPosition.y,
              boxShadow: `0 0 15px ${joystickActive ? 'rgba(66,153,225,0.8)' : 'rgba(0,0,0,0.8)'
                }`
            }}
          />
        </div>
      </div>

      {/* sprint pad (right‑bottom) */}
      <div
        className="fixed bottom-0 right-0 w-1/2 h-1/3 z-[500] flex items-center justify-center"
        onTouchStart={e => { e.preventDefault(); setSprintDown(true); }}
        onTouchEnd={() => setSprintDown(false)}
        onTouchCancel={() => setSprintDown(false)}
      >
        <div
          className={`w-28 h-28 rounded-full flex items-center justify-center
            ${sprintDown ? 'bg-blue-600' : 'bg-black/70 border-4 border-white/60'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>
    </>
  );
}
