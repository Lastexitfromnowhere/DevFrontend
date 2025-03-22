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
  
  const [useDemoNodes, setUseDemoNodes] = useState(true);
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchStatus();
    }
  }, [isAuthenticated, fetchStatus]);

  if (!isAuthenticated) {
    return (
      <Card variant="default">
        <CardHeader>
          <CardTitle>Statut du nœud DHT</CardTitle>
          <CardDescription>
            Connectez-vous pour voir le statut de votre nœud DHT
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Fonction pour rafraîchir les nœuds sans utiliser les nœuds de démonstration
  const refreshRealNodes = async () => {
    setUseDemoNodes(false);
    await fetchNodes(false); // false = ne pas utiliser les nœuds de démonstration
  };

  // Fonction pour rafraîchir les nœuds avec les nœuds de démonstration si nécessaire
  const refreshWithDemoNodes = async () => {
    setUseDemoNodes(true);
    await fetchNodes(true); // true = utiliser les nœuds de démonstration si nécessaire
  };

  return (
    <Card variant="default">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Statut du nœud DHT</CardTitle>
            <CardDescription>
              Réseau décentralisé Kademlia
            </CardDescription>
          </div>
          <Button 
            variant="secondary"
            onClick={() => fetchStatus()}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">État du nœud:</span>
            <BadgeComponent variant={status.isActive ? "success" : "default"}>
              {status.isActive ? "Actif" : "Inactif"}
            </BadgeComponent>
          </div>

          {status.isActive && status.nodeId && (
            <>
              <div className="flex items-center justify-between">
                <span className="font-medium">ID du nœud:</span>
                <span className="text-sm text-gray-500 truncate max-w-[200px]">{status.nodeId}</span>
              </div>

              {status.stats && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Connexions:</span>
                    <span className="text-sm">{status.stats.connections}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Pairs:</span>
                    <span className="text-sm">{status.stats.peers?.length || 0}</span>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </CardContent>
      <CardFooter className="space-x-2">
        {status.isActive ? (
          <Button
            variant="danger"
            icon={<PowerOff className="h-4 w-4" />}
            onClick={stopNode}
            disabled={loading}
            loading={loading}
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
          >
            Démarrer
          </Button>
        )}
        
        {/* Boutons pour rafraîchir les nœuds avec ou sans nœuds de démonstration */}
        <div className="flex ml-auto space-x-2">
          <Button
            variant="secondary"
            icon={<AlertTriangle className="h-4 w-4" />}
            onClick={refreshRealNodes}
            disabled={loading}
          >
            Afficher nœuds réels uniquement
          </Button>
          <Button
            variant="secondary"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={refreshWithDemoNodes}
            disabled={loading}
          >
            Inclure nœuds démo
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
