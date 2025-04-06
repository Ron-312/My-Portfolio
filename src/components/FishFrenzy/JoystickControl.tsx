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
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  
  // Track touch position for calculations
  const touchStart = useRef({ x: 0, y: 0 });
  const touchId = useRef<number | null>(null);
  
  // Debug state
  const [debugInfo, setDebugInfo] = useState("");
  
  // Better mobile detection
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua);
    console.log("Mobile device detection:", isMobile, ua);
    setIsMobileDevice(isMobile);
  }, []);
  
  // Only render on mobile devices during gameplay
  if (!isMobileDevice || !gameStarted || gameOver || loading) {
    return null;
  }
  
  // React synthetic event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length === 0) return;
    
    // Store the starting position and touch ID
    const touch = e.touches[0];
    touchId.current = touch.identifier;
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    
    setJoystickActive(true);
    setDebugInfo("Touch started");
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!joystickActive) return;
    
    // Find our touch by ID
    let activeTouch: React.Touch | null = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === touchId.current) {
        activeTouch = e.touches[i];
        break;
      }
    }
    
    if (!activeTouch) return;
    
    // Calculate movement
    const deltaX = activeTouch.clientX - touchStart.current.x;
    const deltaY = activeTouch.clientY - touchStart.current.y;
    
    // Limit to a circular radius
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxRadius = 50;
    const limitedDistance = Math.min(distance, maxRadius);
    
    // Normalize for direction
    const angle = Math.atan2(deltaY, deltaX);
    const normalizedX = Math.cos(angle) * limitedDistance / maxRadius;
    const normalizedY = Math.sin(angle) * limitedDistance / maxRadius;
    
    // Update visual position
    setJoystickPosition({
      x: Math.cos(angle) * limitedDistance,
      y: Math.sin(angle) * limitedDistance
    });
    
    // Set movement keys based on joystick position
    keysPressed.current['w'] = normalizedY < -0.2;
    keysPressed.current['a'] = normalizedX < -0.2;
    keysPressed.current['s'] = normalizedY > 0.2;
    keysPressed.current['d'] = normalizedX > 0.2;
    keysPressed.current['shift'] = distance > (maxRadius * 0.8);
    
    setDebugInfo(`X: ${normalizedX.toFixed(2)}, Y: ${normalizedY.toFixed(2)}`);
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    
    // Reset everything
    touchId.current = null;
    setJoystickActive(false);
    setJoystickPosition({ x: 0, y: 0 });
    
    // Reset movement keys
    keysPressed.current['w'] = false;
    keysPressed.current['a'] = false;
    keysPressed.current['s'] = false;
    keysPressed.current['d'] = false;
    keysPressed.current['shift'] = false;
    
    setDebugInfo("Touch ended");
  };
  
  return (
    <>
      {/* Fixed debug info */}
      <div className="fixed top-4 left-4 z-[600] bg-black/70 text-white text-xs px-2 py-1 rounded">
        {debugInfo}
      </div>
    
      {/* Make the entire joystick a giant touchable area */}
      <div 
        className="fixed bottom-0 left-0 w-1/2 h-1/3 z-[500] flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* Actual visible joystick */}
        <div 
          className={`w-40 h-40 rounded-full bg-black/70 border-4 ${joystickActive ? 'border-blue-400' : 'border-white/50'}`}
        >
          <div
            className="w-24 h-24 rounded-full bg-blue-500 absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `calc(50% + ${joystickPosition.x}px)`,
              top: `calc(50% + ${joystickPosition.y}px)`,
              boxShadow: '0 0 15px rgba(0,0,0,0.8)'
            }}
          />
        </div>
      </div>
      
      {/* Sprint indicator */}
      <div
        className={`fixed bottom-12 right-12 w-16 h-16 rounded-full flex items-center justify-center z-[500] ${keysPressed.current['shift'] ? 'bg-blue-500' : 'bg-black/80 border-2 border-white/50'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
    </>
  );
}