// src/components/ui/Card.tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'terminal' | 'hover';
}

export function Card({ 
  children, 
  variant = 'default',
  className,
  ...props 
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-md',
        variant === 'terminal' && 'font-mono',
        variant === 'hover' && 'transform transition-all duration-200 hover:scale-[1.02] hover:border-gray-500',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
