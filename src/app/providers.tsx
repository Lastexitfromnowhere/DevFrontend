'use client';

import { WalletContextProvider } from '@/contexts/WalletContext';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { ReactNode } from 'react';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <WalletContextProvider>
      <WalletModalProvider>
        <RewardsProvider>
          {children}
        </RewardsProvider>
      </WalletModalProvider>
    </WalletContextProvider>
  );
}