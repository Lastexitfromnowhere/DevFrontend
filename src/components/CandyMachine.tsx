'use client';

import { FC, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { Metaplex, walletAdapterIdentity } from '@metaplex-foundation/js';
import Image from 'next/image';

interface CandyMachineProps {
  candyMachineId: string;
  presalePrice: number; // en SOL
}

export const CandyMachine: FC<CandyMachineProps> = ({ candyMachineId, presalePrice }) => {
  const wallet = useWallet();
  const { publicKey } = wallet;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleMint = async () => {
    if (!publicKey) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const metaplex = Metaplex.make(connection).use(walletAdapterIdentity(wallet));

      const candyMachine = await metaplex.candyMachines().findByAddress({
        address: new PublicKey(candyMachineId),
      });

      const candyGuard = await metaplex.candyMachines().findCandyGuardByAddress({
        address: candyMachine.candyGuard!,
      });

      const priceBasisPoints =
        candyGuard.groups.find((g) => g.label === 'default')?.guards.solPayment?.amount.basisPoints.toNumber() ?? 0;

      const candyMachinePrice = priceBasisPoints / 1e9;

      if (candyMachinePrice !== presalePrice) {
        setError('Price mismatch with Candy Machine configuration');
        return;
      }

      const { nft } = await metaplex.candyMachines().mint({
        candyMachine,
        candyGuard,
        group: 'default',
      });

      alert(`NFT minted successfully! Mint address: ${nft.address.toBase58()}`);
    } catch (err) {
      console.error('Mint error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="w-full bg-[#19191b] rounded-3xl shadow-2xl p-0 md:p-8 flex flex-col md:flex-row items-center justify-between overflow-hidden relative transition-all duration-500"
      style={{
        minHeight: 400,
        filter: isHovered ? 'none' : 'blur(8px)',
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Halo effet */}
      <div
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 20% 0%, rgba(120,120,255,0.12) 0%, transparent 70%)',
        }}
      />
      {/* Texte à gauche */}
      <div className="flex-1 z-10 flex flex-col justify-center items-start p-8 md:p-12">
        <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-8 leading-tight">LAST<br />PARADOX</h1>
        <p className="text-gray-400 text-lg mb-2 tracking-widest">CLAIM YOUR NFT</p>
        <p className="text-gray-500 text-base mb-8">ONLY 5,000 NFTS AVAILABLE</p>
        {error && <div className="text-red-400 font-medium mb-4">{error}</div>}
      </div>
      {/* Carte à droite */}
      <div className="flex-1 flex justify-center items-center z-10 p-8">
        <div className="relative rounded-2xl shadow-xl overflow-hidden" style={{ boxShadow: '0 0 40px 0 #2228, 0 0 0 8px #23232b' }}>
          <Image src="/0.png" alt="Last Paradox Card" width={420} height={320} className="object-contain" priority />
        </div>
      </div>
      {/* Bouton de mint */}
      <div className="absolute bottom-8 left-0 w-full flex justify-center z-20 pointer-events-none md:static md:w-auto md:justify-end md:pr-16 md:pb-0 md:pt-0 md:pl-0">
        <button
          onClick={handleMint}
          disabled={isLoading || !publicKey}
          className="pointer-events-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 px-10 rounded-xl shadow-lg text-lg transition-all duration-200 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing transaction...' : `Buy NFT (${presalePrice} SOL)`}
        </button>
      </div>
    </div>
  );
};
