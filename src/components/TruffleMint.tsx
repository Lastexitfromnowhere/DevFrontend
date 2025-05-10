'use client';

import { FC, useState } from 'react';

export const TruffleMint: FC = () => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    window.open('https://truffle.wtf/project/last-paradox-jkg4h', '_blank');
  };

  return (
    <div 
      className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg transition-all duration-500 animate-pulse-shadow relative cursor-pointer overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      style={{
        backgroundImage: 'url(https://wind-frontend-rosy.vercel.app/truffle.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundBlendMode: 'overlay',
        height: '250px'
      }}
    >
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all duration-500 z-10"
        style={{
          opacity: isHovered ? 0.3 : 0.6,
        }}
      />
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white">
        <div className="text-center bg-black/30 backdrop-blur-sm p-4 rounded-lg border border-gray-700/30 mb-4">
          <h2 className="text-xl font-semibold mb-2 text-white">
            {`// Truffle Mint: Last Paradox`}
          </h2>
          <p className="text-gray-300 text-sm">
            {`> Exclusive NFT collection on Truffle`}
          </p>
        </div>
        <button 
          className="px-6 py-2 bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 hover:bg-blue-500/40 rounded-lg transition-all duration-300 text-blue-400 font-medium"
          onClick={handleClick}
        >
          Go
        </button>
      </div>
    </div>
  );
}; 