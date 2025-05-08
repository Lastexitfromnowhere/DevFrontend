'use client';

import { FC, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Metaplex, walletAdapterIdentity, toMetaplexFile } from '@metaplex-foundation/js';
import Image from 'next/image';

interface MintNFTProps {
  ipfsCid: string;
}

export const MintNFT: FC<MintNFTProps> = ({ ipfsCid }) => {
  const wallet = useWallet();
  const { publicKey } = wallet;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [mintedCount, setMintedCount] = useState<number>(0);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [pendingMint, setPendingMint] = useState(false);
  const [lastPaymentSig, setLastPaymentSig] = useState<string | null>(null);

  const handleMint = async () => {
    if (!publicKey) {
      setError('Veuillez connecter votre wallet');
      return;
    }
    setShowPaymentConfirm(true);
  };

  const confirmAndMint = async () => {
    setShowPaymentConfirm(false);
    setPendingMint(true);
    try {
      setIsLoading(true);
      setError(null);

      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const metaplex = Metaplex.make(connection).use(walletAdapterIdentity(wallet));

      // 1. Effectuer le paiement avant le mint
      const recipient = new PublicKey('5Jebkekg3BBerCmj5QdweSHtnMSqZQ4297gZoYynET1m');
      const amount = 0.15 * LAMPORTS_PER_SOL;
      const transferTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey!,
          toPubkey: recipient,
          lamports: amount,
        })
      );
      const signature = await wallet.sendTransaction(transferTx, connection);
      setLastPaymentSig(signature);
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      if (confirmation.value.err) {
        throw new Error('Le paiement de 0.15 SOL a échoué. Mint annulé.');
      }

      // 2. Récupérer les métadonnées depuis Pinata pour l'index courant
      const metadataUrl = `https://gateway.pinata.cloud/ipfs/${ipfsCid}/${mintedCount}.json`;
      const response = await fetch(metadataUrl);
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des métadonnées: ${response.statusText}`);
      }

      let metadata;
      try {
        metadata = await response.json();
      } catch (err) {
        throw new Error('Format de métadonnées invalide');
      }

      // Créer l'URI pour l'image
      const imageUri = `https://gateway.pinata.cloud/ipfs/${ipfsCid}/images/${mintedCount}.png`;

      // Vérifier que l'image existe
      const imageResponse = await fetch(imageUri);
      if (!imageResponse.ok) {
        throw new Error('Image NFT non trouvée');
      }

      // 3. Créer le NFT
      const { nft } = await metaplex.nfts().create({
        uri: metadataUrl,
        name: metadata.name,
        symbol: "LPN",
        sellerFeeBasisPoints: 500, // 5%
        creators: [
          {
            address: publicKey!,
            share: 100,
          },
        ],
        isMutable: true,
      });

      setMintedCount(prev => prev + 1);

      alert(`✅ NFT minté avec succès!\n\nVoir sur Solscan:\nhttps://solscan.io/token/${nft.address.toBase58()}?cluster=devnet`);
    } catch (err) {
      console.error('Erreur de mint:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors du minting');
    } finally {
      setIsLoading(false);
      setPendingMint(false);
    }
  };

  return (
    <div
      className="w-full rounded-3xl shadow-2xl p-0 md:p-8 flex flex-col md:flex-row items-center justify-between overflow-hidden relative transition-all duration-500"
      style={{
        minHeight: 400,
        filter: isHovered ? 'none' : 'blur(8px)',
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        backgroundImage: 'url("https://wind-frontend-rosy.vercel.app/LastParadox1.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Overlay sombre pour améliorer la lisibilité */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{
          filter: isHovered ? 'none' : 'blur(8px)',
        }}
      />
      
      {/* Effet de halo */}
      <div
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 20% 0%, rgba(120,120,255,0.12) 0%, transparent 70%)',
        }}
      />
      
      {/* Texte à gauche */}
      <div className="flex-1 z-10 flex flex-col justify-center items-start p-8 md:p-12">
        <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight">LAST<br />PARADOX</h1>
        <p className="text-gray-400 text-lg mb-2 tracking-widest">Private Sale Access</p>
       
        {mintedCount > 0 && (
          <p className="text-gray-400 text-sm mt-1">{mintedCount} NFT(s) minted</p>
        )}
        {error && <div className="text-red-400 font-medium mt-4">{error}</div>}
      </div>

      {/* Image à droite */}
      <div className="flex-1 flex justify-center items-center z-10 p-8">
        <div className="relative rounded-2xl shadow-xl overflow-hidden" style={{ boxShadow: '0 0 40px 0 #2228, 0 0 0 8px #23232b' }}>
          <Image
            src={`https://gateway.pinata.cloud/ipfs/${ipfsCid}/images/${mintedCount}.png`}
            alt={`Last Paradox NFT #${mintedCount}`}
            width={420}
            height={320}
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Bouton de mint */}
      <div className="absolute bottom-8 left-0 w-full flex justify-center z-20 pointer-events-none md:static md:w-auto md:justify-end md:pr-16 md:pb-0 md:pt-0 md:pl-0">
        <button
          onClick={handleMint}
          disabled={isLoading || !publicKey || pendingMint}
          className="pointer-events-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 px-10 rounded-xl shadow-lg text-lg transition-all duration-200 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading || pendingMint ? 'Transaction en cours...' : 'Minter NFT'}
        </button>
      </div>

      {/* Modale de confirmation de paiement */}
      {showPaymentConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-8 shadow-2xl max-w-md w-full text-center">
            <h2 className="text-2xl font-bold mb-4">Confirmer le paiement</h2>
            <p className="mb-4">Vous allez payer <span className="text-blue-400 font-bold">0.15 SOL</span> pour minter ce NFT.<br/>Ce paiement est obligatoire pour accéder à la collection.</p>
            <div className="flex justify-center gap-4 mt-6">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
                onClick={confirmAndMint}
              >
                Confirmer et payer
              </button>
              <button
                className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-lg font-semibold"
                onClick={() => setShowPaymentConfirm(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Affichage du hash de paiement si dispo */}
      {lastPaymentSig && (
        <div className="mt-4 text-xs text-blue-300">
          Paiement envoyé :
          <a
            href={`https://solscan.io/tx/${lastPaymentSig}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline ml-1"
          >
            Voir la transaction sur Solscan
          </a>
        </div>
      )}
    </div>
  );
}; 