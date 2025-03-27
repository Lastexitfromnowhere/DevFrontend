'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import axios from 'axios';

/**
 * Page d'authentification pour les sessions desktop
 * Cette page est affichée lorsqu'un utilisateur scanne un QR code depuis l'application desktop
 */
export default function DesktopAuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { connected, publicKey } = useWallet();
  
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [status, setStatus] = useState<'initial' | 'authenticating' | 'success' | 'error'>('initial');
  const [message, setMessage] = useState<string>('Connexion à votre session desktop...');
  
  // Récupérer le deviceId depuis l'URL
  useEffect(() => {
    if (searchParams) {
      const id = searchParams.get('deviceId');
      if (id) {
        setDeviceId(id);
        setMessage(`Session desktop détectée (ID: ${id}). Connectez votre portefeuille pour vous authentifier.`);
      } else {
        setMessage('Aucun ID de session trouvé dans l\'URL. Veuillez scanner à nouveau le QR code.');
      }
    }
  }, [searchParams]);
  
  // Authentifier l'utilisateur lorsqu'il se connecte avec son portefeuille
  useEffect(() => {
    const authenticateDesktopSession = async () => {
      if (connected && publicKey && deviceId) {
        try {
          setStatus('authenticating');
          setMessage('Authentification en cours...');
          
          // Envoyer l'adresse du portefeuille au backend pour authentifier la session desktop
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/authenticate-desktop-session`,
            {
              deviceId,
              walletAddress: publicKey.toString()
            }
          );
          
          if (response.data.success) {
            setStatus('success');
            setMessage('Authentification réussie ! Vous pouvez maintenant retourner à l\'application desktop.');
            
            // Rediriger vers la page d'accueil après 3 secondes
            setTimeout(() => {
              router.push('/');
            }, 3000);
          } else {
            setStatus('error');
            setMessage(`Erreur lors de l'authentification: ${response.data.message || 'Erreur inconnue'}`);
          }
        } catch (error) {
          console.error('Erreur lors de l\'authentification de la session desktop:', error);
          setStatus('error');
          setMessage('Une erreur est survenue lors de l\'authentification. Veuillez réessayer.');
        }
      }
    };
    
    authenticateDesktopSession();
  }, [connected, publicKey, deviceId, router]);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-md w-full bg-gray-800 p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Authentification Desktop</h1>
        
        <div className="mb-6 text-center">
          <p className="mb-4">{message}</p>
          
          {status === 'success' && (
            <div className="bg-green-800 text-white p-4 rounded-md mb-4">
              <p>✅ Authentification réussie!</p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="bg-red-800 text-white p-4 rounded-md mb-4">
              <p>❌ Erreur d'authentification</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-center mb-6">
          <WalletMultiButton />
        </div>
        
        {deviceId && (
          <div className="text-sm text-gray-400 text-center">
            <p>ID de session: {deviceId}</p>
          </div>
        )}
      </div>
    </div>
  );
}
