// src/components/ui/Modal.tsx
'use client';
import React, { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Interface mise à jour pour inclure le titre
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  title?: string; // Ajout du titre comme propriété optionnelle
}

export function Modal({ 
  isOpen, 
  onClose, 
  children, 
  className = '',
  title // Destructuration du titre
}: ModalProps) {
  // État pour tracker si le composant est monté côté client
  const [isMounted, setIsMounted] = useState(false);

  // S'assure que le rendu n'a lieu que côté client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Ne pas rendre si pas monté ou fermé
  if (!isOpen || !isMounted) return null;

  // Utilisation de createPortal avec vérification côté client
  return isMounted ? createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className={`relative bg-[#111] border border-green-800 rounded-lg p-6 max-w-md w-full ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-green-400 hover:text-green-200 transition-colors"
        >
          <X size={24} />
        </button>
        
        {/* Rendu conditionnel du titre */}
        {title && (
          <h2 className="text-xl font-bold text-green-300 mb-4">
            {title}
          </h2>
        )}
        
        {children}
      </div>
    </div>,
    document.body
  ) : null;
}