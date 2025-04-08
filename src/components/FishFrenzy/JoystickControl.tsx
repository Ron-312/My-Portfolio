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
  const [debugInfo, setDebugInfo] = useState("");
  
  // Using refs, not state, for tracking touch info
  const joystickAreaRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);
  
  // Use a ref for tracking active state to avoid closure issues
  const isActiveRef = useRef(false);
  
  // Mobile detection
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua);
    console.log("Mobile device detection:", isMobile, ua);
    setIsMobileDevice(isMobile || window.location.href.includes('localhost')); // Include localhost for testing
  }, []);
  
  // SINGLE event handling effect - no other touch effects
  useEffect(() => {
    if (!gameStarted) return;
    
    // Prevent page scrolling while touching joystick
    const preventScroll = (e: TouchEvent) => {
      if (isActiveRef.current) {
        e.preventDefault();
      }
    };
    
    // Set up touch start handler
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      
      const touch = e.touches[0];
      const rect = joystickAreaRef.current?.getBoundingClientRect();
      
      if (!rect) return;
      
      // Only handle touches within our joystick area
      if (
        touch.clientX >= rect.left && 
        touch.clientX <= rect.right && 
        touch.clientY >= rect.top && 
        touch.clientY <= rect.bottom
      ) {
        touchIdRef.current = touch.identifier;
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
        
        // Update both the state and ref (ref for immediate access)
        setJoystickActive(true);
        isActiveRef.current = true;
        
        setDebugInfo("Touch started in joystick area");
        e.preventDefault();
      }
    };
    
    // Handle touch move
    const handleTouchMove = (e: TouchEvent) => {
      if (!isActiveRef.current || touchIdRef.current === null) return;
      
      // Find our active touch
      let activeTouch = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchIdRef.current) {
          activeTouch = e.touches[i];
          break;
        }
      }
      
      if (!activeTouch) return;
      
      // Calculate delta
      const deltaX = activeTouch.clientX - touchStartRef.current.x;
      const deltaY = activeTouch.clientY - touchStartRef.current.y;
      
      // Limit distance
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxRadius = 50;
      const limitedDistance = Math.min(distance, maxRadius);
      
      // Get angle and normalized position
      const angle = Math.atan2(deltaY, deltaX);
      const normalizedX = Math.cos(angle) * limitedDistance / maxRadius;
      const normalizedY = Math.sin(angle) * limitedDistance / maxRadius;
      
      // Set joystick position
      setJoystickPosition({
        x: Math.cos(angle) * limitedDistance,
        y: Math.sin(angle) * limitedDistance
      });
      
      // Update movement keys
      const deadzone = 0.2;
      keysPressed.current['w'] = normalizedY < -deadzone;
      keysPressed.current['a'] = normalizedX < -deadzone;
      keysPressed.current['s'] = normalizedY > deadzone;
      keysPressed.current['d'] = normalizedX > deadzone;
      keysPressed.current['shift'] = distance > (maxRadius * 0.8);
      
      setDebugInfo(`X: ${normalizedX.toFixed(2)}, Y: ${normalizedY.toFixed(2)}`);
      e.preventDefault();
    };
    
    // Handle touch end
    const handleTouchEnd = (e: TouchEvent) => {
      // Check if our tracked touch has ended
      let touchFound = false;
      
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchIdRef.current) {
          touchFound = true;
          break;
        }
      }
      
      if (!touchFound) {
        // Reset everything
        touchIdRef.current = null;
        setJoystickActive(false);
        isActiveRef.current = false;
        setJoystickPosition({ x: 0, y: 0 });
        
        // Reset keys
        keysPressed.current['w'] = false;
        keysPressed.current['a'] = false;
        keysPressed.current['s'] = false;
        keysPressed.current['d'] = false;
        keysPressed.current['shift'] = false;
        
        setDebugInfo("Touch ended");
      }
    };
    
    // Add all event listeners to the document
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);
    document.addEventListener('touchmove', preventScroll, { passive: false });
    
    return () => {
      // Clean up ALL listeners
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
      document.removeEventListener('touchmove', preventScroll);
      
      // Reset key state on unmount
      keysPressed.current['w'] = false;
      keysPressed.current['a'] = false;
      keysPressed.current['s'] = false;
      keysPressed.current['d'] = false;
      keysPressed.current['shift'] = false;
    };
  }, [gameStarted, keysPressed]);
  
  // Don't render if not a mobile device or game isn't running
  if (!isMobileDevice || !gameStarted || gameOver || loading) {
    return null;
  }
  
  return (
    <>
      {/* Fixed debug info */}
      <div className="fixed top-4 left-4 z-[600] bg-black/70 text-white text-xs px-2 py-1 rounded">
        {debugInfo}
      </div>
      
      {/* Joystick touch area */}
      <div
        ref={joystickAreaRef}
        className="fixed bottom-0 left-0 w-1/2 h-1/3 z-[500] flex items-center justify-center"
      >
        {/* Visible joystick */}
        <div className="w-40 h-40 rounded-full bg-black/70 border-4 border-white/60 relative">
          <div
            className="w-24 h-24 rounded-full bg-blue-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            style={{
              marginLeft: joystickPosition.x,
              marginTop: joystickPosition.y,
              boxShadow: '0 0 15px rgba(0,0,0,0.8)'
            }}
          />
        </div>
      </div>
      
      {/* Sprint indicator */}
      <div
        className={`fixed bottom-12 right-12 w-16 h-16 rounded-full flex items-center justify-center z-[500] 
          ${keysPressed.current['shift'] ? 'bg-blue-500' : 'bg-black/80 border-2 border-white/50'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
    </>
  );
}