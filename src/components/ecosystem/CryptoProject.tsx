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
      className="max-w-4xl"
    >
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          {projects.map((project, index) => {
            const ProjectIcon = project.icon;
            return (
              <Card 
                key={index}
                variant="hover"
                className="space-y-4"
              >
                <div className="flex items-center space-x-3">
                  <ProjectIcon className="text-green-400" size={32} />
                  <div>
                    <h3 className="font-bold text-green-300">{project.name}</h3>
                    <Badge variant={
                      project.difficulty === 'Easy' ? 'success' :
                      project.difficulty === 'Medium' ? 'warning' :
                      'default'
                    }>
                      {project.difficulty}
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-green-400">{project.description}</p>

                <div className="pt-4 border-t border-green-800/30 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-500">Reward Type:</span>
                    <span className="text-green-300">{project.rewardType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-500">Monthly Est.:</span>
                    <span className="text-green-300">
                      {project.estimatedMonthlyRewards}
                    </span>
                  </div>
                </div>

                <a 
                  href={project.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-400 hover:text-blue-300 text-sm"
                >
                  Visit Project
                  <ArrowUpRight className="ml-1 w-4 h-4" />
                </a>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-xs text-green-500">
          {`// Projects subject to change. Always DYOR (Do Your Own Research)`}
        </p>
      </div>
    </Modal>
  );
}