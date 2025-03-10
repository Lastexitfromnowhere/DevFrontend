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
          <Shield className="mx-auto mb-4 text-purple-400 w-12 h-12" />
          <h2 className="text-xl font-bold text-purple-200">
            {`// Security Warning`}
          </h2>
        </div>

        <div className="bg-gray-950 border border-purple-800 rounded p-4 space-y-3">
          <div className="flex items-start space-x-3">
            <p className="text-sm text-purple-300">
              # Create a dedicated wallet for this platform
            </p>
          </div>
          <div className="flex items-start space-x-3">
            <p className="text-sm text-purple-300">
              # Keep experimental interactions isolated
            </p>
          </div>
        </div>

        <WalletMultiButton 
          className="w-full bg-gray-600 text-purple py-2 rounded 
                     hover:bg-gray-700 transition-colors flex 
                     items-center justify-center"
        >
          <Terminal className="w-4 h-4 mr-2" />
          $ connect_wallet
        </WalletMultiButton>
      </div>
    </Modal>
  );
}
