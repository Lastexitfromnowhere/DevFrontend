// src/components/dht/DHTStatus.tsx
import React, { useEffect, useState } from 'react';
import { useDHT } from '@/hooks/useDHT';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { DashboardButton } from '@/components/ui/DashboardButton';
import { DashboardBadge } from '@/components/ui/DashboardBadge';
import { Loader2, Power, PowerOff, RefreshCw, AlertTriangle } from 'lucide-react';

// Étendre l'interface TerminalButtonProps pour inclure onClick
interface ExtendedTerminalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: React.ReactNode;
  loading?: boolean;
  onClick?: () => void;
}

interface CardHeaderProps {
  children: React.ReactNode;
}

interface CardTitleProps {
  children: React.ReactNode;
}

interface CardDescriptionProps {
  children: React.ReactNode;
}

interface CardContentProps {
  children: React.ReactNode;
}

interface CardFooterProps {
  className?: string;
  children: React.ReactNode;
}

interface BadgeProps {
  variant: 'success' | 'default';
  children: React.ReactNode;
}

// Composants Card internes
const CardHeader: React.FC<CardHeaderProps> = ({ children }: CardHeaderProps) => (
  <div className="mb-4">{children}</div>
);

const CardTitle: React.FC<CardTitleProps> = ({ children }: CardTitleProps) => (
  <h3 className="text-lg font-semibold">{children}</h3>
);

const CardDescription: React.FC<CardDescriptionProps> = ({ children }: CardDescriptionProps) => (
  <p className="text-sm text-gray-500">{children}</p>
);

const CardContent: React.FC<CardContentProps> = ({ children }: CardContentProps) => (
  <div className="p-4 pt-0">{children}</div>
);

const CardFooter: React.FC<CardFooterProps> = ({ className = '', children }: CardFooterProps) => (
  <div className={`p-4 pt-0 flex justify-between items-center ${className}`}>{children}</div>
);

const BadgeComponent: React.FC<BadgeProps> = ({ variant, children }: BadgeProps) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
    variant === 'success' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
  }`}>
    {children}
  </span>
);

const Button: React.FC<ExtendedTerminalButtonProps> = ({ 
  children, 
  variant = 'primary', 
  icon, 
  loading = false, 
  onClick,
  ...props 
}) => (
  <DashboardButton 
    className={`flex items-center justify-center space-x-2 ${
      variant === 'primary' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
      variant === 'secondary' ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' :
      'bg-red-600 hover:bg-red-700 text-white'
    }`}
    onClick={onClick}
    {...props}
  >
    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
    <span>{children}</span>
  </DashboardButton>
);

export default function DHTStatus() {
  const { isAuthenticated } = useAuth();
  const { 
    status, 
    loading, 
    error, 
    startNode, 
    stopNode, 
    fetchStatus,
    fetchNodes
  } = useDHT();
  
  // Définir un type pour les résultats du diagnostic
  type DiagnosticResult = {
    success: boolean;
    serverReachable: boolean;
    authValid: boolean;
    nodeRegistered: boolean;
    nodeActive: boolean;
    details: Record<string, any>;
    errors: Array<{
      step: string;
      message: string;
      status?: number;
      data?: any;
    }>;
    error?: string;
  };
  
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult | null>(null);
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchStatus();
      fetchNodes(); // Appel sans argument, la fonction ne prend plus de paramètre
    }
  }, [isAuthenticated, fetchStatus, fetchNodes]);

  // Fonction pour exécuter le diagnostic de connectivité
  const runDiagnostic = async () => {
    setIsDiagnosticRunning(true);
    setDiagnosticResults(null);
    
    try {
      // Importer dynamiquement dhtUtils pour éviter les problèmes de dépendances circulaires
      const dhtUtils = (await import('@/utils/dhtUtils')).default;
      const results = await dhtUtils.testDHTConnectivity();
      console.log('Résultats du diagnostic de connectivité DHT:', results);
      setDiagnosticResults(results as DiagnosticResult);
    } catch (error: any) {
      console.error('Erreur lors du diagnostic de connectivité DHT:', error);
      setDiagnosticResults({
        success: false,
        error: error.message,
        serverReachable: false,
        authValid: false,
        nodeRegistered: false,
        nodeActive: false,
        details: {},
        errors: [{ step: 'global', message: error.message }]
      });
    } finally {
      setIsDiagnosticRunning(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg">
        <CardHeader>
          <div className="text-white font-bold text-lg mb-1">Statut du nœud DHT</div>
          <div className="text-gray-300 text-sm">
            Connectez-vous pour voir le statut de votre nœud DHT
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg transition-all duration-500 animate-pulse-shadow">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-white font-bold text-lg mb-1">Nœud DHT</div>
            <div className="text-gray-300 text-sm">
              Réseau décentralisé Kademlia
            </div>
          </div>
          <DashboardButton 
            variant="secondary"
            onClick={() => fetchStatus()}
            disabled={loading}
            className="p-2"
            icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          />
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-500/20 text-red-400 border border-red-500/30 p-3 rounded-md mb-4 backdrop-blur-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-300">État du nœud:</span>
            <DashboardBadge variant={status.isActive ? "success" : "default"} dot>
              {status.isActive ? "Actif" : "Inactif"}
            </DashboardBadge>
          </div>

          {status.isActive && status.nodeId && (
            <>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-300">ID du nœud:</span>
                <span className="text-sm text-gray-400 truncate max-w-[200px] bg-black/30 backdrop-blur-sm border border-gray-700/30 rounded p-1 font-mono">{status.nodeId}</span>
              </div>

              {status.stats && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-300">Connexions:</span>
                    <span className="text-sm text-gray-200 bg-black/30 backdrop-blur-sm border border-gray-700/30 rounded px-2 py-1">{status.stats.connections}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-300">Pairs:</span>
                    <span className="text-sm text-gray-200 bg-black/30 backdrop-blur-sm border border-gray-700/30 rounded px-2 py-1">{status.stats.peers?.length || 0}</span>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </CardContent>
      <CardFooter className="space-x-2 border-t border-gray-700/30 pt-4">
        {status.isActive ? (
          <DashboardButton
            variant="danger"
            icon={<PowerOff className="h-4 w-4" />}
            onClick={stopNode}
            disabled={loading}
            loading={loading}
          >
            Arrêter
          </DashboardButton>
        ) : (
          <DashboardButton
            variant="primary"
            icon={<Power className="h-4 w-4" />}
            onClick={startNode}
            disabled={loading}
            loading={loading}
          >
            Démarrer
          </DashboardButton>
        )}
        
        {/* Boutons pour rafraîchir les nœuds avec ou sans nœuds de démonstration */}
        <div className="flex ml-auto space-x-2">
          <DashboardButton
            variant="secondary"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={runDiagnostic}
            disabled={isDiagnosticRunning}
            loading={isDiagnosticRunning}
          >
            {isDiagnosticRunning ? 'Diagnostic en cours' : 'Exécuter le diagnostic'}
          </DashboardButton>
        </div>
      </CardFooter>
      
      {diagnosticResults && (
        <div className="mt-4 p-4 border border-gray-700/30 rounded-md bg-black/30 backdrop-blur-sm">
          <h4 className="text-lg font-semibold mb-2 text-white">Résultats du diagnostic</h4>
          <ul className="space-y-1 text-gray-300">
            <li>Serveur accessible: <DashboardBadge variant={diagnosticResults.serverReachable ? "success" : "danger"} size="sm">{diagnosticResults.serverReachable ? 'Oui' : 'Non'}</DashboardBadge></li>
            <li>Authentification valide: <DashboardBadge variant={diagnosticResults.authValid ? "success" : "danger"} size="sm">{diagnosticResults.authValid ? 'Oui' : 'Non'}</DashboardBadge></li>
            <li>Nœud enregistré: <DashboardBadge variant={diagnosticResults.nodeRegistered ? "success" : "danger"} size="sm">{diagnosticResults.nodeRegistered ? 'Oui' : 'Non'}</DashboardBadge></li>
            <li>Nœud actif: <DashboardBadge variant={diagnosticResults.nodeActive ? "success" : "danger"} size="sm">{diagnosticResults.nodeActive ? 'Oui' : 'Non'}</DashboardBadge></li>
            {diagnosticResults.errors && diagnosticResults.errors.length > 0 && (
              <li className="mt-2">
                <span className="font-medium text-white">Erreurs:</span>
                <ul className="ml-4 mt-1 space-y-1">
                  {diagnosticResults.errors.map((err, idx) => (
                    <li key={idx} className="text-red-400">
                      <span className="font-medium">{err.step}:</span> {err.message}
                    </li>
                  ))}
                </ul>
              </li>
            )}
          </ul>
        </div>
      )}
    </Card>
  );
}
