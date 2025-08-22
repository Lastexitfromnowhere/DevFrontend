import React, { useState } from 'react';
interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}
export function Tooltip({ 
  children, 
  content,
  position = 'top' 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const positions = {
    top: '-translate-y-full -translate-x-1/2 left-1/2 bottom-[calc(100%+5px)]',
    bottom: 'translate-y-2 -translate-x-1/2 left-1/2 top-full',
    left: '-translate-x-full -translate-y-1/2 top-1/2 right-[calc(100%+5px)]',
    right: 'translate-x-2 -translate-y-1/2 top-1/2 left-full'
  };
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {isVisible && (
        <div 
          className={`
            absolute z-50 px-2 py-1 text-xs font-mono
            bg-black border border-green-800 rounded
            text-green-400 whitespace-nowrap
            ${positions[position]}
          `}
        >
          {content}
        </div>
      )}
      {children}
    </div>
  );
}
