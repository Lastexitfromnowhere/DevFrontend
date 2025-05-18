'use client';

import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Shield, Terminal } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

interface WalletDisclaimerProps {
  onDismiss: () => void;
}

export default function WalletDisclaimer({ onDismiss }: WalletDisclaimerProps) {
  return (
    <Modal 
      isOpen={true} 
      onClose={onDismiss} 
      className="max-w-md"
    >
      <div className="space-y-6">
        <div className="text-center">
          <Shield className="mx-auto mb-4 text-gray-500 w-12 h-12" />
          <h2 className="text-xl font-bold text-gray-200">
            {`// Security Warning`}
          </h2>
        </div>

        <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-xl p-4 space-y-3 shadow-lg">
          <div className="flex items-start space-x-3">
            <p className="text-sm text-blue-200">
              # Utilise un wallet dédié pour cette plateforme
            </p>
          </div>
          <div className="flex items-start space-x-3">
            <p className="text-sm text-blue-200">
              # Garde tes interactions expérimentales isolées
            </p>
          </div>
        </div>

        <WalletMultiButton 
          className="w-full bg-blue-800/80 text-blue-100 py-2 rounded-xl 
                     hover:bg-blue-700 transition-colors flex 
                     items-center justify-center font-semibold shadow-md"
        >
          <Terminal className="w-4 h-4 mr-2" />
          $ Connect Wallet
        </WalletMultiButton>
      </div>
    </Modal>
  );
}
