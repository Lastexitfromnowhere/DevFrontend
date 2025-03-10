// src/components/ecosystem/ProjectsGrid.tsx
import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Project } from '@/types/ecosystem.types';
import Image from 'next/image';

const projects: Project[] = [
  {
    id: 1,
    name: 'GetGrass',
    category: 'AI Agent',
    description: 'Join the GetGrass testnet and earn GRASS tokens through active participation',
    logo: 'https://imgs.search.brave.com/_kptpb7uL83AygKe2p70jJseNoeCk54OVNAOYnQHStU/rs:fit:500:0:0:0/g:ce/aHR0cHM6Ly9pbWcu/Yml0Z2V0aW1nLmNv/bS9tdWx0aUxhbmcv/d2ViLzM4YTdhNWQy/YzYyMmY2YTMwZDQ4/NWI1MGQ0ZmUxMDRj/LnBuZw',
    link: 'https://app.getgrass.io/register/?referralCode=6YkiJ8oFRgT4s9O',
    rewards: 'Early Access + GRASS Tokens'
  },
  {
    id: 2,
    name: 'Humanity Protocol',
    category: 'Identity',
    description: 'Building decentralized identity verification with HEART token rewards',
    logo: 'https://imgs.search.brave.com/uov8tQrcQIt0PKg04KQoOptHOdno_Z-EdN867kHUPYM/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9zdGF0aWMud2l4c3RhdGljLmNvbS9tZWRpYS8wZGU0YWZfZDhmZThjYmNhZmJlNGRlYzlmNDg0MGUwODg2Njg5NGJ0bXYyLnBuZy92MS9maWxsL3dfNjAwLGhfMzM4LGFsX2MscV84NSx1c20_MC42Nl8xLjAwXzAuMDEsZW5jX2F2aWYscXVhbGl0eV9hdXRvL0h1bWFuaXR5JTIwcHJvdG9jb2wucG5n',
    link: 'https://testnet.humanity.org/login?ref=undacore',
    rewards: 'HEART Testnet Tokens'
  },
  // ... autres projets
];

export default function ProjectsGrid() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(project => (
          <Card 
            key={project.id}
            variant="hover"
            className="relative overflow-hidden"
          >
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-20"
              style={{ 
                backgroundImage: `url(${project.logo})`,
                filter: 'grayscale(100%)'
              }}
            />
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 flex items-center justify-center bg-black/50 rounded-lg">
                  <Image 
                    src={project.logo} 
                    alt={`${project.name} logo`}
                    width={48}
                    height={48}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <Badge>{project.category}</Badge>
              </div>
  
              <div className="space-y-4">
                <h3 className="text-xl font-medium text-green-300">
                  {project.name}
                </h3>
                <p className="text-sm text-green-400">
                  {project.description}
                </p>
                <div className="pt-4 border-t border-green-800/30">
                  <p className="text-sm text-green-500">Current Rewards</p>
                  <p className="text-purple-400">{project.rewards}</p>
                </div>
              </div>
  
              <a 
                href={project.link}
                target="_blank" 
                rel="noopener noreferrer" 
                className="mt-4 inline-flex items-center text-green-400 hover:text-green-300 transition-colors"
              >
                Join Project <ArrowUpRight className="ml-1 w-4 h-4" />
              </a>
            </div>
          </Card>
        ))}
      </div>
    );
  }
