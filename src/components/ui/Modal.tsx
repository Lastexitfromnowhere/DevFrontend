// src/components/ui/Modal.tsx
'use client';
import React, { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Updated interface to include title
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  title?: string; // Added title as an optional property
}

export function Modal({ 
  isOpen, 
  onClose, 
  children, 
  className = '',
  title // Destructuring the title
}: ModalProps) {
  // State to track if component is mounted on client side
  const [isMounted, setIsMounted] = useState(false);

  // Ensures rendering only happens on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Don't render if not mounted or closed
  if (!isOpen || !isMounted) return null;

  // Using createPortal with client-side verification
  return isMounted ? createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md"
      onClick={onClose}
    >
      <div 
        className={`relative bg-black/40 backdrop-blur-md border border-white/20 rounded-lg p-6 max-w-md w-full ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-white hover:text-blue-300 transition-colors"
        >
          <X size={24} />
        </button>
        
        {/* Conditional rendering of the title */}
        {title && (
          <h2 className="text-xl font-bold text-gray-300 mb-4">
            {title}
          </h2>
        )}
        
        {children}
      </div>
    </div>,
    document.body
  ) : null;
}