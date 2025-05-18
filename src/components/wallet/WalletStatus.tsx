// src/components/wallet/WalletStatus.tsx
import React from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import { Card } from '@/components/ui/Card';
import { TerminalButton } from '@/components/ui/terminal';
import { Users, LogOut } from 'lucide-react';

export default function WalletStatus() {
  const { isConnected, isAuthReady, account, chain, disconnectWallet } = useWalletContext();

  // N'affiche le statut que si la session est sécurisée (signature OK)
  if (!isConnected || !isAuthReady || !account) return null;

  return (
    <Card variant="terminal" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-gray-300">Wallet Status</span>
        </div>
        <TerminalButton
          variant="danger"
          onClick={disconnectWallet}
          icon={<LogOut className="w-4 h-4" />}
          className="text-xs px-2 py-1"
        >
          disconnect
        </TerminalButton>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-500">address:</span>
          <span className="text-gray-300 font-mono">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">network:</span>
          <span className="text-gray-300">{chain}</span>
        </div>
      </div>
    </Card>
  );
}
