// src/components/dht/DHTStatus.tsx
import React, { useEffect, useState } from 'react';
import { useDHT } from '@/hooks/useDHT';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { TerminalButton } from '@/components/ui/terminal/TerminalButton';
import { Badge } from '@/components/ui/Badge';
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
  <TerminalButton 
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
  </TerminalButton>
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
      fetchNodes(false); // false = ne pas utiliser les nœuds de démonstration
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
      <Card variant="default">
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
    <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 shadow-lg transition-all duration-500 animate-pulse-shadow" variant="default">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-white font-bold text-lg mb-1">Nœud DHT</div>
            <div className="text-gray-300 text-sm">
              Réseau décentralisé Kademlia
            </div>
          </div>
          <Button 
            variant="secondary"
            onClick={() => fetchStatus()}
            disabled={loading}
            className="bg-gray-700/50 hover:bg-gray-600/50 p-2 rounded transition-all duration-200"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
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
            <div className={`inline-flex items-center rounded-full font-medium ${status.isActive ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gray-700/50 text-gray-300 border border-gray-600/30'} px-2.5 py-0.5 text-sm`}>
              {status.isActive ? "Actif" : "Inactif"}
            </div>
          </div>

          {status.isActive && status.nodeId && (
            <>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-300">ID du nœud:</span>
                <span className="text-sm text-gray-400 truncate max-w-[200px] bg-gray-800/60 backdrop-blur-sm border border-gray-700/30 rounded p-1 font-mono">{status.nodeId}</span>
              </div>

              {status.stats && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-300">Connexions:</span>
                    <span className="text-sm text-gray-200 bg-gray-800/60 backdrop-blur-sm border border-gray-700/30 rounded px-2 py-1">{status.stats.connections}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-300">Pairs:</span>
                    <span className="text-sm text-gray-200 bg-gray-800/60 backdrop-blur-sm border border-gray-700/30 rounded px-2 py-1">{status.stats.peers?.length || 0}</span>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </CardContent>
      <CardFooter className="space-x-2 border-t border-gray-700/30 pt-4">
        {status.isActive ? (
          <Button
            variant="danger"
            icon={<PowerOff className="h-4 w-4" />}
            onClick={stopNode}
            disabled={loading}
            loading={loading}
            className="bg-red-600/80 hover:bg-red-700/80 text-white backdrop-blur-sm transition-all duration-200"
          >
            Arrêter
          </Button>
        ) : (
          <Button
            variant="primary"
            icon={<Power className="h-4 w-4" />}
            onClick={startNode}
            disabled={loading}
            loading={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all duration-200"
          >
            Démarrer
          </Button>
        )}
        
        {/* Boutons pour rafraîchir les nœuds avec ou sans nœuds de démonstration */}
        <div className="flex ml-auto space-x-2">
          <Button
            variant="secondary"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={runDiagnostic}
            disabled={isDiagnosticRunning}
            loading={isDiagnosticRunning}
            className="bg-gray-700/50 hover:bg-gray-600/50 p-2 rounded transition-all duration-200"
          >
            {isDiagnosticRunning ? 'Diagnostic en cours' : 'Exécuter le diagnostic'}
          </Button>
          {diagnosticResults && (
            <div className="mt-4 p-4 border border-gray-200 rounded-md bg-gray-50">
              <h4 className="text-lg font-semibold mb-2">Résultats du diagnostic</h4>
              <ul className="space-y-1">
                <li>Serveur accessible: <span className={diagnosticResults.serverReachable ? "text-green-600 font-medium" : "text-red-600 font-medium"}>{diagnosticResults.serverReachable ? 'Oui' : 'Non'}</span></li>
                <li>Authentification valide: <span className={diagnosticResults.authValid ? "text-green-600 font-medium" : "text-red-600 font-medium"}>{diagnosticResults.authValid ? 'Oui' : 'Non'}</span></li>
                <li>Nœud enregistré: <span className={diagnosticResults.nodeRegistered ? "text-green-600 font-medium" : "text-red-600 font-medium"}>{diagnosticResults.nodeRegistered ? 'Oui' : 'Non'}</span></li>
                <li>Nœud actif: <span className={diagnosticResults.nodeActive ? "text-green-600 font-medium" : "text-red-600 font-medium"}>{diagnosticResults.nodeActive ? 'Oui' : 'Non'}</span></li>
                {diagnosticResults.errors && diagnosticResults.errors.length > 0 && (
                  <li className="mt-2">
                    <span className="font-medium">Erreurs:</span>
                    <ul className="ml-4 mt-1 space-y-1">
                      {diagnosticResults.errors.map((err, idx) => (
                        <li key={idx} className="text-red-600">
                          <span className="font-medium">{err.step}:</span> {err.message}
                        </li>
                      ))}
                    </ul>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
