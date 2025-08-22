"use client";
import React, { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink, X } from 'lucide-react';
interface ReferralBannerProps {
  referralCode: string;
  referralUrl: string;
  fixed?: boolean;
}
const ReferralBanner: React.FC<ReferralBannerProps> = ({ 
  referralCode, 
  referralUrl,
  fixed = true 
}) => {
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
  const containerClasses = fixed 
    ? "fixed top-4 right-4 z-50 max-w-md animate-fade-in-down" 
    : "relative w-full";
  return (
    <div className={containerClasses}>
      <div 
        className={`
          backdrop-blur-md bg-black/40 border border-gray-700/50
          p-4 rounded-lg shadow-lg transition-all duration-500
          animate-pulse-shadow
        `}
      >
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg mb-1">Partagez Codeium !</h3>
            <p className="text-gray-300 text-sm mb-2">
              Utilisez mon code de parrainage pour obtenir des avantages
            </p>
            <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/30 rounded p-2 flex items-center justify-between">
              <span className="text-gray-200 font-mono">{referralCode}</span>
              <button
                onClick={copyToClipboard}
                className="ml-2 bg-gray-700/50 hover:bg-gray-600/50 p-2 rounded transition-all duration-200"
                aria-label="Copier le code de parrainage"
              >
                {copied ? (
                  <Check className="text-green-400 h-4 w-4" />
                ) : (
                  <Copy className="text-gray-200 h-4 w-4" />
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
            className="text-xs text-gray-300 underline hover:text-blue-300 flex items-center"
          >
            <span>Ouvrir le lien</span>
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
          <button
            onClick={() => setIsVisible(false)}
            className="text-xs text-gray-300 opacity-70 hover:opacity-100 flex items-center"
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
