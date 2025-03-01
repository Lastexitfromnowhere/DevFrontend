'use client';

import { WalletContextProvider } from '@/contexts/WalletContext';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { ReactNode } from 'react';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <WalletContextProvider>
      <WalletModalProvider>
        {children}
      </WalletModalProvider>
    </WalletContextProvider>
  );
}