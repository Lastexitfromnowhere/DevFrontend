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
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <img 
  src="/vps.gif" 
  alt="VPS Animation" 
  className="block mx-auto max-w-full h-auto mb-4"
/>
          <NewspaperIcon className="text-gray-400" size={20} />
          <h3 className="font-bold text-gray-300">Latest Updates</h3>
        </div>
        <a 
          href="#" 
          className="text-sm text-gray-400 hover:text-gray-300 flex items-center"
        >
          View All <ArrowRight size={16} className="ml-1" />
        </a>
      </div>

      <div className="space-y-2">
        {mockNews.map((item) => (
          <a 
            key={item.id}
            href={item.link}
            className="block p-3 rounded bg-black/20 hover:bg-black/30 
                     transition-colors border border-transparent
                     hover:border-gray-800"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-300 flex items-center">
                  {item.title}
                  <ExternalLink size={12} className="ml-1 text-gray-500" />
                </p>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>{item.source}</span>
                  <span>•</span>
                  <span>{new Date(item.date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>

      <div className="text-center text-xs text-gray-400 pt-2 border-t border-gray-800/30">
        {`// Real-time updates from the Brand Exit ecosystem`}
      </div>
    </Card>
  );
}
