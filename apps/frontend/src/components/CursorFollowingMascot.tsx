import React, { useState, useEffect } from 'react';

interface Position {
  x: number;
  y: number;
}

export const CursorFollowingMascot: React.FC = () => {
  const [eyePos, setEyePos] = useState<Position>({ x: 0, y: 0 });
  const mascotRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {

      if (mascotRef.current) {
        const mascotRect = mascotRef.current.getBoundingClientRect();
        const mascotCenterX = mascotRect.left + mascotRect.width / 2;
        const mascotCenterY = mascotRect.top + mascotRect.height / 2;

        // Calculate angle to cursor
        const angle = Math.atan2(e.clientY - mascotCenterY, e.clientX - mascotCenterX);
        
        // Calculate eye position (follow cursor within limit)
        const distance = 8;
        setEyePos({
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      ref={mascotRef}
      className="fixed bottom-8 right-8 z-40 pointer-events-none animate-bounce-soft"
      style={{
        animation: 'float 3s ease-in-out infinite',
      }}
    >
      {/* Mascot Body */}
      <div className="relative w-24 h-24">
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full blur-2xl opacity-50 animate-pulse"></div>

        {/* Main Body */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-400 to-blue-500 rounded-full shadow-2xl flex items-center justify-center overflow-hidden">
          {/* Shine Effect */}
          <div className="absolute top-2 left-2 w-6 h-6 bg-white rounded-full opacity-40 blur-sm"></div>

          {/* Eyes Container */}
          <div className="flex gap-3 absolute">
            {/* Left Eye */}
            <div className="relative w-5 h-5">
              <div className="absolute inset-0 bg-white rounded-full shadow-md">
                {/* Pupil */}
                <div
                  className="absolute w-2 h-2 bg-gray-900 rounded-full top-1.5 left-1.5 transition-transform duration-75"
                  style={{
                    transform: `translate(${eyePos.x}px, ${eyePos.y}px)`,
                  }}
                >
                  {/* Shine in pupil */}
                  <div className="absolute top-0.5 left-0.5 w-0.5 h-0.5 bg-white rounded-full opacity-80"></div>
                </div>
              </div>
            </div>

            {/* Right Eye */}
            <div className="relative w-5 h-5">
              <div className="absolute inset-0 bg-white rounded-full shadow-md">
                {/* Pupil */}
                <div
                  className="absolute w-2 h-2 bg-gray-900 rounded-full top-1.5 left-1.5 transition-transform duration-75"
                  style={{
                    transform: `translate(${eyePos.x}px, ${eyePos.y}px)`,
                  }}
                >
                  {/* Shine in pupil */}
                  <div className="absolute top-0.5 left-0.5 w-0.5 h-0.5 bg-white rounded-full opacity-80"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Mouth */}
          <div className="absolute bottom-3 w-3 h-2 bg-gray-900 rounded-full"></div>
        </div>

        {/* Floating Particles */}
        <div className="absolute -top-2 -left-2 w-3 h-3 bg-purple-300 rounded-full animate-pulse" style={{ animation: 'float 4s ease-in-out infinite' }}></div>
        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-pink-300 rounded-full animate-pulse" style={{ animation: 'float 3.5s ease-in-out infinite 0.5s' }}></div>
        <div className="absolute top-0 -right-3 w-2 h-2 bg-blue-300 rounded-full animate-pulse" style={{ animation: 'float 4.5s ease-in-out infinite 1s' }}></div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
      `}</style>
    </div>
  );
};

export default CursorFollowingMascot;
