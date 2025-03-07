"use client";

// src/components/ecosystem/LearningHub.tsx
import React from 'react';
import { Book, Video, FileText, Podcast } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { LearningResource } from '@/types/ecosystem.types';

const learningResources: LearningResource[] = [
  {
    icon: Book,
    title: "Blockchain Fundamentals",
    description: "Comprehensive guide to understanding blockchain technology.",
    level: "Beginner",
    type: "eBook",
    duration: "2-3 hours",
    link: "#"
  },
  {
    icon: Video,
    title: "Web3 Development Masterclass",
    description: "In-depth course on building decentralized applications.",
    level: "Intermediate",
    type: "Video Course",
    duration: "10-12 hours",
    link: "#"
  },
  // ... autres ressources
];

export default function LearningHub({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Learning Hub"
      className="max-w-4xl"
    >
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          {learningResources.map((resource, index) => {
            const ResourceIcon = resource.icon;
            return (
              <Card
                key={index}
                variant="hover"
                className="space-y-4"
              >
                <div className="flex items-center space-x-3">
                  <ResourceIcon className="text-green-400" size={24} />
                  <div>
                    <h3 className="font-bold text-green-300">{resource.title}</h3>
                    <Badge className="mt-1">{resource.level}</Badge>
                  </div>
                </div>

                <p className="text-sm text-green-400">{resource.description}</p>

                <div className="pt-4 border-t border-green-800/30 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-green-500">Type:</span>
                    <span className="text-green-300">{resource.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-500">Duration:</span>
                    <span className="text-green-300">{resource.duration}</span>
                  </div>
                </div>

                <a 
                  href={resource.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-blue-400 hover:text-blue-300"
                >
                  Access Resource →
                </a>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-xs text-green-500">
          {`// Continuous learning is key to Web3 mastery`}
        </p>
      </div>
    </Modal>
  );
}
