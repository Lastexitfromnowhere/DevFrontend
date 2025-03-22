import React from 'react';
import { ArrowUpRight, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { DashboardBadge } from '@/components/ui/DashboardBadge';
import type { Project } from '@/types/ecosystem.types';
import Image from 'next/image';

const projects: Project[] = [
  {
    id: 1,
    name: 'GetGrass',
    category: 'AI Agent',
    description: 'Join the GetGrass testnet and earn GRASS tokens through active participation',
    logo: '/grass.jpg',
    link: 'https://app.getgrass.io/register/?referralCode=6YkiJ8oFRgT4s9O',
    rewards: 'Early Access + GRASS Tokens'
  },
  {
    id: 2,
    name: 'Humanity Protocol',
    category: 'Identity',
    description: 'Building decentralized identity verification with HEART token rewards',
    logo: '/human.jpg',
    link: 'https://testnet.humanity.org/login?ref=undacore',
    rewards: 'HEART Testnet Tokens'
  },
  {
   id: 3,
   name: 'Bless Network',
   category: 'AI Agent',
   description: 'Community-driven network with innovative reward mechanisms',
   logo: 'bless.jpg',
   link: 'https://bless.network/dashboard?ref=LHT6I4',
   rewards: 'BLESS Network Tokens'
 },
  // ... autres projets
];

export default function ProjectsGrid() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(project => (
          <Card 
            key={project.id}
            className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl hover:bg-black/50 relative overflow-hidden"
          >
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-10"
              style={{ 
                backgroundImage: `url(${project.logo})`,
                filter: 'blur(8px)'
              }}
            />
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-lg border border-gray-700/30">
                  <Image 
                    src={project.logo} 
                    alt={`${project.name} logo`}
                    width={48}
                    height={48}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <DashboardBadge variant="info">{project.category}</DashboardBadge>
              </div>
  
              <div className="space-y-4">
                <h3 className="text-xl font-medium text-white">
                  {project.name}
                </h3>
                <p className="text-sm text-gray-300">
                  {project.description}
                </p>
                <div className="pt-4 border-t border-gray-700/30 backdrop-blur-sm">
                  <p className="text-sm text-gray-400">Récompenses actuelles</p>
                  <p className="text-blue-400 font-medium">{project.rewards}</p>
                </div>
              </div>
  
              <a 
                href={project.link}
                target="_blank" 
                rel="noopener noreferrer" 
                className="mt-4 inline-flex items-center bg-blue-500/20 backdrop-blur-sm text-blue-400 hover:text-blue-300 transition-colors px-3 py-2 rounded-md border border-blue-500/30"
              >
                Rejoindre <ExternalLink className="ml-1 w-4 h-4" />
              </a>
            </div>
          </Card>
        ))}
      </div>
    );
  }
