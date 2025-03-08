// src/components/ui/card-components.tsx
import React from 'react';
import { cn } from '@/lib/utils';

// CardHeader
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardHeader({ 
  children, 
  className,
  ...props 
}: CardHeaderProps) {
  return (
    <div
      className={cn('mb-4', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// CardTitle
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export function CardTitle({ 
  children, 
  className,
  ...props 
}: CardTitleProps) {
  return (
    <h3
      className={cn('text-lg font-semibold text-white', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

// CardDescription
interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export function CardDescription({ 
  children, 
  className,
  ...props 
}: CardDescriptionProps) {
  return (
    <p
      className={cn('text-sm text-gray-400', className)}
      {...props}
    >
      {children}
    </p>
  );
}

// CardContent
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardContent({ 
  children, 
  className,
  ...props 
}: CardContentProps) {
  return (
    <div
      className={cn('', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// CardFooter
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardFooter({ 
  children, 
  className,
  ...props 
}: CardFooterProps) {
  return (
    <div
      className={cn('mt-4 pt-4 border-t border-green-800/30', className)}
      {...props}
    >
      {children}
    </div>
  );
}
