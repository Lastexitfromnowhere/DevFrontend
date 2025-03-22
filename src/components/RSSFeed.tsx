"use client";

// src/components/RSSFeed.tsx
import React from 'react';
import { Card } from '@/components/ui/Card';
import { NewspaperIcon, ArrowRight, ExternalLink } from 'lucide-react';
import type { RSSItem } from '@/types/ecosystem.types';

const mockNews: RSSItem[] = [
  {
    id: 1,
    title: "Brand Exit Announces Major Protocol Upgrade",
    date: "2025-02-23",
    link: "#",
    source: "Brand Exit Blog"
  },
  {
    id: 2,
    title: "Community Governance Proposal #12 Passes",
    date: "2025-02-22",
    link: "#",
    source: "Governance Forum"
  },
  {
    id: 3,
    title: "New Partnership with Leading DeFi Protocol",
    date: "2025-02-21",
    link: "#",
    source: "Brand Exit Blog"
  },
  {
    id: 4,
    title: "Monthly Node Operator Rewards Distribution",
    date: "2025-02-20",
    link: "#",
    source: "Treasury Updates"
  }
];

export default function RSSFeed() {
  return (
    <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg transition-all duration-500 animate-pulse-shadow space-y-4">
      <div className="flex items-center justify-between bg-black/30 backdrop-blur-sm p-3 rounded-lg border border-gray-700/30">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-full bg-blue-500/20 backdrop-blur-sm">
            <NewspaperIcon className="text-blue-400" size={20} />
          </div>
          <h3 className="font-bold text-white">Latest Updates</h3>
        </div>
        <a 
          href="#" 
          className="text-sm text-blue-400 hover:text-blue-300 flex items-center bg-blue-500/10 backdrop-blur-sm p-1.5 rounded transition-all duration-200 border border-blue-500/20 hover:border-blue-500/40"
        >
          View All <ArrowRight size={16} className="ml-1" />
        </a>
      </div>

      <div className="space-y-2">
        {mockNews.map((item) => (
          <a 
            key={item.id}
            href={item.link}
            className="block p-3 rounded backdrop-blur-sm bg-black/30 hover:bg-black/50 
                     transition-all duration-300 border border-gray-700/30
                     hover:border-gray-600"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-sm font-medium text-white flex items-center">
                  {item.title}
                  <ExternalLink size={12} className="ml-1 text-blue-400" />
                </p>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <span className="bg-blue-500/10 backdrop-blur-sm p-1 rounded">{item.source}</span>
                  <span>•</span>
                  <span>{new Date(item.date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>

      <div className="text-center text-xs text-gray-400 bg-black/20 backdrop-blur-sm p-2 rounded-md border-t border-gray-700/30">
        {`// Real-time updates from the Brand Exit ecosystem`}
      </div>
    </Card>
  );
}
