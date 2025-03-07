// src/types/ecosystem.types.ts

import { LucideIcon } from 'lucide-react';

export interface Project {
  id: number;
  name: string;
  category: string;
  description: string;
  logo: string;
  link: string;
  rewards: string;
}

export interface LearningResource {
  icon: LucideIcon;
  title: string;
  description: string;
  level: string;
  type: string;
  duration: string;
  link: string;
}

export interface EcosystemFeature {
  icon: LucideIcon;
  title: string;
  description: string;
  command: string;
  modalComponent?: React.ComponentType<{ onClose: () => void }>;
}

export interface NodeStatus {
  active: boolean;
  bandwidth: number;
  earnings: number;
  connectedUsers: number;
  lastUpdated: string;
  nodeIp?: string | null; // Ajoutez cette ligne
}

export interface NetworkStats {
  totalNodes: number;
  activeNodes: number;
  totalBandwidth: number;
  averageUptime: number;
  networkHealth: 'healthy' | 'warning' | 'critical';
}

export interface RSSItem {
  id: number;
  title: string;
  date: string;
  link: string;
  source: string;
}