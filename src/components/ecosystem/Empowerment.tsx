"use client";

// src/components/ecosystem/Empowerment.tsx
import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { 
  Key, 
  Shield, 
  CreditCard, 
  Users, 
  Database, 
  Lock 
} from 'lucide-react';

const empowermentFeatures = [
  {
    icon: Key,
    title: "Self-Custody",
    description: "Be your own bank with secure wallet solutions."
  },
  {
    icon: Shield,
    title: "Decentralized Identity",
    description: "Take control of your online presence."
  },
  {
    icon: CreditCard,
    title: "DeFi Access",
    description: "Participate in decentralized finance without intermediaries."
  },
  {
    icon: Users,
    title: "DAO Governance",
    description: "Have a say in the projects you support."
  },
  {
    icon: Database,
    title: "Data Ownership",
    description: "Control and monetize your personal data."
  },
  {
    icon: Lock,
    title: "Privacy First",
    description: "Enhanced privacy through decentralized solutions."
  }
];

export default function Empowerment({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Web3 Empowerment"
      className="max-w-2xl"
    >
      <div className="space-y-6">
        <p className="text-green-300">
          Web3 empowerment is about giving individuals control over their digital 
          assets and online identities. Here's how we contribute to this vision:
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          {empowermentFeatures.map((feature, index) => {
            const FeatureIcon = feature.icon;
            return (
              <Card key={index} variant="hover" className="p-4">
                <div className="flex space-x-3">
                  <FeatureIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-green-300 mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-green-400">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="text-center text-sm text-green-500">
          {`// Empowering users in the decentralized web, one feature at a time.`}
        </div>
      </div>
    </Modal>
  );
}
