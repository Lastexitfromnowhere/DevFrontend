// src/components/ecosystem/CryptoProject.tsx
import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { 
  Leaf, 
  Network, 
  Server, 
  Zap,
  ArrowUpRight 
} from 'lucide-react';

const projects = [
  {
    name: "Grass Node",
    icon: Leaf,
    description: "Decentralized data sharing network. Earn rewards by providing network bandwidth and storage.",
    rewardType: "Bandwidth & Storage",
    difficulty: "Easy",
    estimatedMonthlyRewards: "50-200 RWRD",
    website: "https://grassnode.io"
  },
  {
    name: "Web3 Relay",
    icon: Network,
    description: "Blockchain infrastructure project. Earn by running validator nodes and maintaining network stability.",
    rewardType: "Validator Nodes",
    difficulty: "Medium",
    estimatedMonthlyRewards: "100-500 RWRD",
    website: "https://web3relay.com"
  },
  {
    name: "Decentralized Compute",
    icon: Server,
    description: "Distributed computing platform. Provide computing resources and earn passive income.",
    rewardType: "Computational Power",
    difficulty: "Advanced",
    estimatedMonthlyRewards: "200-1000 RWRD",
    website: "https://decentral-compute.io"
  },
  {
    name: "Energy Chain",
    icon: Zap,
    description: "Renewable energy blockchain. Contribute to green energy verification and earn rewards.",
    rewardType: "Energy Validation",
    difficulty: "Medium",
    estimatedMonthlyRewards: "75-300 RWRD",
    website: "https://energychain.net"
  }
];

export default function CryptoProject({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Available Crypto Projects"
      className="max-w-4xl backdrop-blur-md bg-black/40 border border-gray-700/50 shadow-lg"
    >
      <div className="space-y-6 animate-fade-in-down">
        <div className="grid md:grid-cols-2 gap-4">
          {projects.map((project, index) => {
            const ProjectIcon = project.icon;
            return (
              <Card 
                key={index}
                variant="hover"
                className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-4 rounded-lg shadow-lg transition-all duration-500 space-y-4 hover:shadow-xl"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-800/60 backdrop-blur-sm border border-gray-700/30 rounded-lg">
                    <ProjectIcon className="text-blue-400" size={32} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{project.name}</h3>
                    <Badge variant={
                      project.difficulty === 'Easy' ? 'success' :
                      project.difficulty === 'Medium' ? 'warning' :
                      'default'
                    }
                    className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/30 text-gray-200">
                      {project.difficulty}
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-gray-300">{project.description}</p>

                <div className="pt-4 border-t border-gray-700/30 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Reward Type:</span>
                    <span className="text-gray-200">{project.rewardType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Monthly Est.:</span>
                    <span className="text-gray-200">
                      {project.estimatedMonthlyRewards}
                    </span>
                  </div>
                </div>

                <a 
                  href={project.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-400 hover:text-blue-300 text-sm bg-gray-800/40 backdrop-blur-sm border border-gray-700/30 rounded p-2 transition-all duration-200"
                >
                  Visit Project
                  <ArrowUpRight className="ml-1 w-4 h-4" />
                </a>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-400">
          {`// Projects subject to change. Always DYOR (Do Your Own Research)`}
        </p>
      </div>
    </Modal>
  );
}