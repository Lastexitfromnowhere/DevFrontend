"use client";

import React, { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink, X } from 'lucide-react';

interface ReferralBannerProps {
  referralCode: string;
  referralUrl: string;
}

const ReferralBanner: React.FC<ReferralBannerProps> = ({ referralCode, referralUrl }) => {
  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isShimmering, setIsShimmering] = useState(true);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  // Effet de scintillement
  useEffect(() => {
    const interval = setInterval(() => {
      setIsShimmering(prev => !prev);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-fade-in-down">
      <div 
        className={`
          bg-gradient-to-r from-indigo-600 to-blue-500 
          p-4 rounded-lg shadow-lg transition-all duration-500
          animate-pulse-shadow
        `}
      >
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg mb-1">Partagez Codeium !</h3>
            <p className="text-white text-sm mb-2">
              Utilisez mon code de parrainage pour obtenir des avantages
            </p>
            <div className="bg-white bg-opacity-20 rounded p-2 flex items-center justify-between">
              <span className="text-white font-mono">{referralCode}</span>
              <button
                onClick={copyToClipboard}
                className="ml-2 bg-white bg-opacity-30 hover:bg-opacity-40 p-2 rounded transition-all duration-200"
                aria-label="Copier le code de parrainage"
              >
                {copied ? (
                  <Check className="text-green-400 h-4 w-4" />
                ) : (
                  <Copy className="text-white h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-3 flex justify-between">
          <a
            href={referralUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white underline hover:text-blue-200 flex items-center"
          >
            <span>Ouvrir le lien</span>
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
          <button
            onClick={() => setIsVisible(false)}
            className="text-xs text-white opacity-70 hover:opacity-100 flex items-center"
          >
            <span>Fermer</span>
            <X className="ml-1 h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReferralBanner;
