"use client";

// src/components/ui/Button.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  disabled,
  loading = false,
  icon,
  iconPosition = 'left',
  ...props
}: ButtonProps) {
  // Définition des styles de base et des variantes
  const variants = {
    primary: 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700',
    secondary: 'bg-[#111] hover:bg-gray-800 text-gray-300 border border-gray-800',
    danger: 'bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50',
    ghost: 'bg-transparent hover:bg-gray-800/50 text-gray-400 hover:text-white border border-transparent'
  };

  // Définition des tailles
  const sizes = {
    sm: 'text-xs px-2 py-1 rounded',
    md: 'text-sm px-3 py-2 rounded-md',
    lg: 'text-base px-4 py-2 rounded-md'
  };

  // État désactivé ou en chargement
  const isDisabled = disabled || loading;

  return (
    <button
      className={cn(
        'font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-opacity-50',
        variants[variant],
        sizes[size],
        isDisabled && 'opacity-70 cursor-not-allowed',
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      <span className="flex items-center justify-center gap-2">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!loading && icon && iconPosition === 'left' && icon}
        {children}
        {!loading && icon && iconPosition === 'right' && icon}
      </span>
    </button>
  );
}
