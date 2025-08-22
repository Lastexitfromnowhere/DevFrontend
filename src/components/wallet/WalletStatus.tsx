import React from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import { Card } from '@/components/ui/Card';
import { TerminalButton } from '@/components/ui/terminal';
import { Users, LogOut, Mail } from 'lucide-react';
export default function WalletStatus() {
  const { isConnected, isAuthReady, account, chain, disconnectWallet, isGoogleWallet } = useWalletContext();
  if (!isConnected || !isAuthReady || (!account && !isGoogleWallet)) return null;
  const displayAccount = account || (isGoogleWallet ? 'Google-User' : null);
  return (
    <Card variant="terminal" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isGoogleWallet ? (
            <Mail className="w-4 h-4 text-blue-400" />
          ) : (
            <Users className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-gray-300">
            {isGoogleWallet ? 'Google Wallet' : 'Wallet Status'}
          </span>
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
            {displayAccount && typeof displayAccount === 'string' && displayAccount.length > 10 
              ? `${displayAccount.slice(0, 6)}...${displayAccount.slice(-4)}`
              : displayAccount}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">network:</span>
          <span className="text-gray-300">{chain}</span>
        </div>
        {isGoogleWallet && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500">type:</span>
            <span className="text-blue-400">Google Generated</span>
          </div>
        )}
      </div>
    </Card>
  );
}
