import { useEffect, useRef, useState } from 'react';

interface JoystickProps {
  keysPressed: React.MutableRefObject<Record<string, boolean>>;
  gameStarted: boolean;
  gameOver: boolean;
  loading: boolean;
}

export default function JoystickControl({ keysPressed, gameStarted, gameOver, loading }: JoystickProps) {
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPosition, setJoystickPosition] = useState({ x: 0, y: 0 });
  const [joystickBasePosition, setJoystickBasePosition] = useState({ x: 0, y: 0 });
  const joystickRef = useRef<HTMLDivElement>(null);
  const isTouchDevice = useRef(false);

  // Check if device supports touch
  useEffect(() => {
    const checkTouch = () => {
      const isTouchCapable = (
        'ontouchstart' in window || 
        navigator.maxTouchPoints > 0
      );
      console.log("Joystick: Touch device detected:", isTouchCapable);
      isTouchDevice.current = isTouchCapable;
    };
    
    checkTouch();
    
    // Backup detection method
    window.addEventListener('touchstart', () => {
      isTouchDevice.current = true;
      console.log("Joystick: Touch event detected");
    }, { once: true });
  }, []);

  // Joystick touch handlers
  useEffect(() => {
    if (!gameStarted) return;
    
    function handleJoystickStart(e: TouchEvent) {
      console.log("Joystick: Touch start");
      // Important: Store which touch ID we're tracking
      const touch = e.touches[0];
      const touchId = touch.identifier;
      
      setJoystickActive(true);
      setJoystickBasePosition({
        x: touch.clientX,
        y: touch.clientY
      });
      setJoystickPosition({ x: 0, y: 0 });
      
      // DEBUG: Force attach tracking to document body
      const trackTouch = (e: TouchEvent) => {
        // Find our touch by ID
        let touchIndex = -1;
        for (let i = 0; i < e.touches.length; i++) {
          if (e.touches[i].identifier === touchId) {
            touchIndex = i;
            break;
          }
        }
        if (touchIndex === -1) return;
        
        const touch = e.touches[touchIndex];
        
        // Same calculation logic as before
        const deltaX = touch.clientX - joystickBasePosition.x;
        const deltaY = touch.clientY - joystickBasePosition.y;
        
        // Limit radius
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxRadius = 50;
        const limitedDistance = Math.min(distance, maxRadius);
        
        // Calculate normalized position
        const angle = Math.atan2(deltaY, deltaX);
        const normalizedX = Math.cos(angle) * limitedDistance / maxRadius;
        const normalizedY = Math.sin(angle) * limitedDistance / maxRadius;
        
        // Visual position update
        setJoystickPosition({
          x: Math.cos(angle) * limitedDistance,
          y: Math.sin(angle) * limitedDistance
        });
        
        // Reset keys
        keysPressed.current['w'] = false;
        keysPressed.current['a'] = false;
        keysPressed.current['s'] = false;
        keysPressed.current['d'] = false;
        
        // Apply key presses based on joystick position
        const deadzone = 0.2;
        
        if (normalizedX > deadzone) keysPressed.current['d'] = true;
        if (normalizedX < -deadzone) keysPressed.current['a'] = true;
        if (normalizedY < -deadzone) keysPressed.current['w'] = true;
        if (normalizedY > deadzone) keysPressed.current['s'] = true;
        
        // Sprint when pushed far
        keysPressed.current['shift'] = distance > (maxRadius * 0.8);
        
        e.preventDefault();
      };
      
      // This is critical - attach move handler to document.body
      document.body.addEventListener('touchmove', trackTouch, { passive: false });
      
      // And set up a one-time cleanup for this specific touch
      const endTouch = () => {
        setJoystickActive(false);
        setJoystickPosition({ x: 0, y: 0 });
        
        // Reset keys and remove our temporary handler
        keysPressed.current['w'] = false;
        keysPressed.current['a'] = false;
        keysPressed.current['s'] = false;
        keysPressed.current['d'] = false;
        keysPressed.current['shift'] = false;
        
        document.body.removeEventListener('touchmove', trackTouch);
        document.body.removeEventListener('touchend', endTouch);
        document.body.removeEventListener('touchcancel', endTouch);
      };
      
      document.body.addEventListener('touchend', endTouch, { once: true });
      document.body.addEventListener('touchcancel', endTouch, { once: true });
      
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Just set up the initial touchstart handler
    if (joystickRef.current) {
      joystickRef.current.addEventListener('touchstart', handleJoystickStart, { 
        passive: false
      });
    }
    
    return () => {
      if (joystickRef.current) {
        joystickRef.current.removeEventListener('touchstart', handleJoystickStart);
      }
    };
  }, [gameStarted, joystickBasePosition, keysPressed]);
  
  // Don't render anything if we're not on a touch device, or the game isn't running
  if (!isTouchDevice.current || !gameStarted || gameOver || loading) {
    return null;
  }
  
  return (
    <div className="absolute bottom-8 left-12 z-[100] select-none">
      <div
        ref={joystickRef}
        className="w-24 h-24 rounded-full bg-black/50 border-2 border-white/40 relative"
        style={{
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          msUserSelect: 'none',
        }}
      >
        <div
          className="w-14 h-14 rounded-full bg-blue-500/90 absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `calc(50% + ${joystickPosition.x * 0.75}px)`,
            top: `calc(50% + ${joystickPosition.y * 0.75}px)`,
            boxShadow: '0 0 10px rgba(0,0,0,0.5)'
          }}
        />
      </div>

      {/* Sprint indicator */}
      <div
        className={`absolute -right-12 bottom-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${keysPressed.current['shift'] ? 'bg-blue-500 text-white' : 'bg-black/50 text-white/70'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
    </div>
  );
}