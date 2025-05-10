"use client";

// src/components/ecosystem/LearningHub.tsx
import React from 'react';
import { Book, Video, FileText, Podcast, ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { DashboardBadge } from '@/components/ui/DashboardBadge';
import { DashboardButton } from '@/components/ui/DashboardButton';
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
      title="Last Paradox Learning Hub"
      className="max-w-4xl backdrop-blur-md bg-black/40 border border-gray-700/50 shadow-lg transition-all duration-500 animate-pulse-shadow"
    >
      <div className="space-y-6 animate-fade-in-down">
        <div className="grid md:grid-cols-2 gap-4">
          {learningResources.map((resource, index) => {
            const ResourceIcon = resource.icon;
            return (
              <Card
                key={index}
                className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-4 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl hover:bg-black/50 space-y-4"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-blue-500/20 backdrop-blur-sm">
                    <ResourceIcon className="text-blue-400" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{resource.title}</h3>
                    <DashboardBadge 
                      variant={
                        resource.level === 'Beginner' ? 'info' : 
                        resource.level === 'Intermediate' ? 'warning' : 'danger'
                      } 
                      size="sm" 
                      className="mt-1"
                    >
                      {resource.level}
                    </DashboardBadge>
                  </div>
                </div>

                <p className="text-sm text-gray-300">{resource.description}</p>

                <div className="pt-4 border-t border-gray-700/30 backdrop-blur-sm text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type:</span>
                    <span className="text-white">{resource.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Duration:</span>
                    <span className="text-white">{resource.duration}</span>
                  </div>
                </div>

                <DashboardButton
                  variant="ghost"
                  size="sm"
                  icon={<ExternalLink size={14} />}
                  onClick={() => window.open(resource.link, '_blank')}
                  className="mt-2"
                >
                  Access Resource
                </DashboardButton>
              </Card>
            );
          })}
        </div>

        <div className="text-center text-xs text-gray-400 bg-black/20 backdrop-blur-sm p-2 rounded-md">
          {`// Freedom • Security • Anonymity`}
        </div>
      </div>
    </Modal>
  );
}
