'use client';

import { FC, useState } from 'react';

export const TruffleMint: FC = () => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    window.open('https://truffle.wtf/project/last-paradox-jkg4h', '_blank');
  };

  return (
    <div 
      className="w-full h-64 relative rounded-lg overflow-hidden cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      style={{
        backgroundImage: 'url(https://wind-frontend-rosy.vercel.app/truffle.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-500 z-10 flex flex-col items-center justify-center"
        style={{
          opacity: isHovered ? 0.4 : 0.7,
        }}
      />
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white">
        <h2 className="text-2xl font-bold mb-4">Truffle Mint</h2>
        <button 
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-full transition-colors duration-300"
          onClick={handleClick}
        >
          Go
        </button>
      </div>
    </div>
  );
};