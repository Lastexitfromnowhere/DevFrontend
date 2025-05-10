'use client';

import { FC, useState } from 'react';

export const TruffleMint: FC = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="w-full h-screen relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-500 z-10"
        style={{
          opacity: isHovered ? 0 : 1,
          pointerEvents: 'none'
        }}
      />
      <iframe
        src="https://truffle.wtf/project/last-paradox-jkg4h"
        className="w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}; 