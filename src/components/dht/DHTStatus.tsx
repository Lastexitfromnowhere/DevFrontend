// src/components/dht/DHTStatus.tsx
import React, { useEffect } from 'react';
import { useDHT } from '@/hooks/useDHT';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { TerminalButton } from '@/components/ui/terminal/TerminalButton';
import { Badge } from '@/components/ui/Badge';
import { Loader2, Power, PowerOff, RefreshCw } from 'lucide-react';

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
  <div className="py-2">{children}</div>
);

const CardFooter: React.FC<CardFooterProps> = ({ className, children }: CardFooterProps) => (
  <div className={`mt-4 pt-4 border-t border-gray-800 ${className || ''}`}>{children}</div>
);

const BadgeComponent: React.FC<BadgeProps> = ({ variant, children }: BadgeProps) => (
  <span className={`px-2 py-1 rounded-md text-xs ${variant === 'success' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{children}</span>
);

// Alias pour TerminalButton avec l'interface étendue
const Button = TerminalButton as React.FC<ExtendedTerminalButtonProps>;

export default function DHTStatus() {
  const { isAuthenticated } = useAuth();
  const { 
    status, 
    loading, 
    error, 
    fetchStatus, 
    startNode, 
    stopNode 
  } = useDHT();

  // Rafraîchir le statut périodiquement
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      fetchStatus();
    }, 30000); // Toutes les 30 secondes

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchStatus]);

  if (!isAuthenticated) {
    return (
      <Card variant="default">
        <CardHeader>
          <CardTitle>Statut du nœud DHT</CardTitle>
          <CardDescription>
            Connectez-vous pour voir le statut du nœud DHT
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

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
                    <span>{status.stats.connections}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-medium">Pairs connectés:</span>
                    <span>{status.stats.peers.length}</span>
                  </div>

                  {status.stats.addresses.length > 0 && (
  <div className="mt-4">
    <h4 className="text-sm font-medium mb-2">Adresses d&apos;écoute:</h4>
    <div className="bg-gray-700 p-2 rounded-md text-xs overflow-auto max-h-[100px] text-gray-200">
      {status.stats.addresses.map((addr: string, index: number) => (
        <div key={index} className="mb-1 break-all">
          {addr}
        </div>
      ))}
    </div>
  </div>
)}

                  {status.stats.peers.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Pairs connectés:</h4>
                      <div className="bg-gray-50 p-2 rounded-md text-xs overflow-auto max-h-[150px]">
                        {status.stats.peers.map((peer: any, index: number) => (
                          <div key={index} className="mb-2 break-all">
                            <div><strong>ID:</strong> {peer?.id ? `${peer.id.substring(0, 20)}...` : 'ID non disponible'}</div>
                            <div><strong>Direction:</strong> {peer?.direction || 'N/A'}</div>
                            <div><strong>Latence:</strong> {peer?.latency !== undefined ? `${peer.latency}ms` : 'N/A'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="primary"
          onClick={() => fetchStatus()}
          disabled={loading}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Rafraîchir
        </Button>

        {status.isActive ? (
          <Button
            variant="danger"
            onClick={() => stopNode()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PowerOff className="mr-2 h-4 w-4" />
            )}
            Arrêter
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={() => startNode()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Power className="mr-2 h-4 w-4" />
            )}
            Démarrer
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
