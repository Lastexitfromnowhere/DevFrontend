import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { Spinner } from '../../components/ui/Spinner';
import { config } from '../../config/env';
import { authService } from '../../services/authService';

// Page de callback Discord : traite le code d'auth et complète la liaison
export default function DiscordCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = router.query.code as string;

    async function linkDiscord() {
      if (!code) return;
      setStatus('pending');
      setError(null);
      try {
        // Récupère le token JWT du wallet (adapte selon ton authService)
        const token = authService.getToken();
        if (!token) {
          setError("Vous n'êtes pas authentifié. Veuillez vous connecter.");
          setStatus('error');
          return;
        }
        const response = await axios.post(`${config.API_BASE_URL}/discord/complete-link`, { code }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          setStatus('success');
          // Redirige vers la page d'accueil ou dashboard après succès
          setTimeout(() => {
            window.location.href = 'https://lastparadox.xyz/?discordLinked=true';
          }, 1500);
        } else {
          setError(response.data.message || "Une erreur est survenue lors de la liaison avec Discord.");
          setStatus('error');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Une erreur est survenue lors de la liaison avec Discord.");
        setStatus('error');
      }
    }

    if (code) linkDiscord();
  }, [router.query.code]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <h2>Liaison Discord en cours...</h2>
      {status === 'pending' && <Spinner />}
      {status === 'success' && <div style={{ color: 'green', marginTop: 20 }}>Votre compte Discord a été lié avec succès ! Redirection...</div>}
      {status === 'error' && <div style={{ color: 'red', marginTop: 20 }}>{error}</div>}
    </div>
  );
}
