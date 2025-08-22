import React from 'react';
import { Card } from './Card';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card-components';
import { Button } from './Button';
import { RefreshCw, Power, PowerOff, Settings, Info } from 'lucide-react';
interface ActionPanelProps {
  title: string;
  description?: string;
  status?: 'active' | 'inactive' | 'loading';
  onRefresh?: () => void;
  onStart?: () => void;
  onStop?: () => void;
  onSettings?: () => void;
  onInfo?: () => void;
  children?: React.ReactNode;
}
export function ActionPanel({
  title,
  description,
  status = 'inactive',
  onRefresh,
  onStart,
  onStop,
  onSettings,
  onInfo,
  children
}: ActionPanelProps) {
  const isLoading = status === 'loading';
  const isActive = status === 'active';
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {onRefresh && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onRefresh}
              disabled={isLoading}
              icon={<RefreshCw className="h-4 w-4" />}
            >
              Rafraîchir
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex space-x-2">
          {onInfo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onInfo}
              icon={<Info className="h-4 w-4" />}
            >
              Info
            </Button>
          )}
          {onSettings && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSettings}
              icon={<Settings className="h-4 w-4" />}
            >
              Paramètres
            </Button>
          )}
        </div>
        <div>
          {isActive && onStop && (
            <Button
              variant="danger"
              size="md"
              onClick={onStop}
              disabled={isLoading}
              loading={isLoading}
              icon={<PowerOff className="h-4 w-4" />}
            >
              Arrêter
            </Button>
          )}
          {!isActive && onStart && (
            <Button
              variant="primary"
              size="md"
              onClick={onStart}
              disabled={isLoading}
              loading={isLoading}
              icon={<Power className="h-4 w-4" />}
            >
              Démarrer
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
