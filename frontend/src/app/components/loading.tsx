"use client"
import { useState, useEffect } from 'react';

export default function LuxuryCurrencyLoader({ 
  size = "medium", 
  theme = "gold",
  blur = true,
  overlay = true
}) {
  const [animationFrame, setAnimationFrame] = useState(0);
  const [sparklePositions, setSparklePositions] = useState([]);
  const currencySymbols = ['$', '€', '£', '¥', '₿'];
  
  // Size classes mapping
  const sizeClasses = {
    small: {
      container: "p-3",
      dot: "w-4 h-4",
      gap: "gap-2",
      blur: "backdrop-blur-sm",
      ring: "w-16 h-16"
    },
    medium: {
      container: "p-5",
      dot: "w-6 h-6",
      gap: "gap-3",
      blur: "backdrop-blur-md",
      ring: "w-24 h-24"
    },
    large: {
      container: "p-7",
      dot: "w-8 h-8",
      gap: "gap-4",
      blur: "backdrop-blur-lg",
      ring: "w-32 h-32"
    }
  };
  
  // Theme colors mapping
  const themeColors = {
    gold: {
      bg: "bg-yellow-50/60",
      border: "border-yellow-300",
      glow: "shadow-yellow-300/50",
      dots: ["bg-yellow-400", "bg-yellow-500", "bg-yellow-600"],
      ring: "from-yellow-300/80 via-yellow-500/40 to-yellow-600/10",
      sparkle: "bg-yellow-200"
    },
    dark: {
      bg: "bg-gray-900/80",
      border: "border-gray-700",
      glow: "shadow-white/30",
      dots: ["bg-gray-400", "bg-gray-500", "bg-gray-600"],
      ring: "from-gray-300/50 via-gray-500/30 to-gray-700/10",
      sparkle: "bg-white"
    },
    green: {
      bg: "bg-green-50/60",
      border: "border-green-300",
      glow: "shadow-green-300/50",
      dots: ["bg-green-400", "bg-green-500", "bg-green-600"],
      ring: "from-green-300/80 via-green-500/40 to-green-600/10",
      sparkle: "bg-green-200"
    },
    blue: {
      bg: "bg-blue-50/60",
      border: "border-blue-300",
      glow: "shadow-blue-300/50",
      dots: ["bg-blue-400", "bg-blue-500", "bg-blue-600"],
      ring: "from-blue-300/80 via-blue-500/40 to-blue-600/10",
      sparkle: "bg-blue-200"
    }
  };
  
  // Get correct classes based on props
  const currentSize = sizeClasses[size] || sizeClasses.medium;
  const currentTheme = themeColors[theme] || themeColors.gold;
  
  // Animation for dots
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 60);
      
      // Randomly create new sparkles
      if (Math.random() > 0.7) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 50;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        const size = 2 + Math.random() * 4;
        const duration = 1 + Math.random() * 2;
        const id = Date.now();
        
        setSparklePositions(prev => [...prev, {id, x, y, size, duration}]);
        
        // Remove sparkle after animation
        setTimeout(() => {
          setSparklePositions(prev => prev.filter(s => s.id !== id));
        }, duration * 1000);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, []);
  
  // Container rendering
  const renderLoader = () => (
    <div className="relative">
      {/* Animated rings */}
      <div className={`absolute inset-0 flex items-center justify-center`}>
        <div className={`${currentSize.ring} rounded-full absolute animate-ping opacity-20 ${currentTheme.bg}`}></div>
        <div className={`${currentSize.ring} rounded-full absolute animate-pulse bg-gradient-radial ${currentTheme.ring}`}></div>
      </div>
      
      {/* Sparkles */}
      {sparklePositions.map((sparkle) => (
        <div 
          key={sparkle.id}
          className={`absolute rounded-full ${currentTheme.sparkle} animate-sparkle`}
          style={{
            left: 'calc(50% + ' + sparkle.x + 'px)',
            top: 'calc(50% + ' + sparkle.y + 'px)',
            width: sparkle.size + 'px',
            height: sparkle.size + 'px',
            opacity: 0.8,
            animation: `sparkle ${sparkle.duration}s ease-out forwards`
          }}
        ></div>
      ))}
      
      {/* Currency symbols animation */}
      <div className={`flex items-center justify-center ${currentSize.gap} relative z-10`}>
        {[0, 1, 2].map((dotIndex) => {
          // Calculate which currency symbol to show based on animation frame
          const symbolIndex = (animationFrame + dotIndex) % currencySymbols.length;
          
          // Calculate pulse effect based on animation frame
          const isActive = (animationFrame % 3) === dotIndex;
          const baseScale = dotIndex === 1 ? 1.2 : 1;
          const scale = isActive ? `scale-${baseScale * 1.25}` : `scale-${baseScale}`;
          const opacity = isActive ? 'opacity-100' : 'opacity-80';
          
          // Add 3D rotation
          const rotation = ((animationFrame + dotIndex * 8) % 40) - 20;
          
          return (
            <div 
              key={dotIndex}
              className={`
                ${currentSize.dot}
                flex items-center justify-center 
                rounded-full transition-all duration-300
                ${currentTheme.dots[dotIndex]}
                ${opacity}
                shadow-xl transform
                hover:scale-125
                animate-shimmer
              `}
              style={{ 
                transform: `${scale === 'scale-1' ? 'scale(1)' : scale === 'scale-1.2' ? 'scale(1.2)' : scale === 'scale-1.25' ? 'scale(1.25)' : 'scale(1.5)'} rotateY(${rotation}deg)`,
                boxShadow: isActive ? '0 0 15px 5px rgba(255,255,255,0.3)' : 'none'
              }}
            >
              <span className="text-white font-bold drop-shadow-md">
                {currencySymbols[symbolIndex]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
  
  // Return either just the loader or with overlay
  return overlay ? (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className={`absolute inset-0 bg-black/30 ${blur ? 'backdrop-blur-sm' : ''}`}></div>
      {renderLoader()}
    </div>
  ) : renderLoader();
}
