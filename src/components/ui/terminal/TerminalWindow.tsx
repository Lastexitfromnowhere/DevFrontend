// src/components/ui/terminal/TerminalWindow.tsx
import React from 'react';
import { Terminal } from 'lucide-react';

interface TerminalWindowProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function TerminalWindow({ title = "~/terminal", children, className = "" }: TerminalWindowProps) {
  return (
    <div className={`bg-[#111] border border-green-800 rounded-lg overflow-hidden ${className}`}>
      <div className="flex items-center space-x-2 p-2 border-b border-green-800 bg-black/40">
        <Terminal className="w-4 h-4 text-green-400" />
        <span className="text-sm text-green-400 font-mono">{title}</span>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}