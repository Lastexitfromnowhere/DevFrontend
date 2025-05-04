'use client';

import { ReactNode } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';

import { WalletContextProvider } from '@/contexts/WalletContext';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';

export default function ClientProviders({ children }: { children: ReactNode }) {
  const network = WalletAdapterNetwork.Devnet;

  const endpoint = 'https://api.devnet.solana.com';

  const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ];

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletContextProvider>
            <RewardsProvider>
              {children}
              <OfflineIndicator />
            </RewardsProvider>
          </WalletContextProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
