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
                <h3 className="text-xl font-medium text-orange-700">
                  {project.name}
                </h3>
                <p className="text-sm text-orange-800">
                  {project.description}
                </p>
                <div className="pt-4 border-t border-gray-900">
                  <p className="text-sm text-orange-600">Current Rewards</p>
                  <p className="text-purple-400">{project.rewards}</p>
                </div>
              </div>
  
              <a 
                href={project.link}
                target="_blank" 
                rel="noopener noreferrer" 
                className="mt-4 inline-flex items-center text-orange-700 hover:text-orange-600 transition-colors"
              >
                Join Project <ArrowUpRight className="ml-1 w-4 h-4" />
              </a>
            </div>
          </Card>
        ))}
      </div>
    );
  }
