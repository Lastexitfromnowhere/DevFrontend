// src/components/rewards/ClaimPopup.tsx
import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { TerminalButton } from '@/components/ui/terminal';
import { Sparkles, Trophy } from 'lucide-react';

interface ClaimPopupProps {
  onClose: () => void;
  amount: number;
  days: number;
}

export function ClaimPopup({ onClose, amount, days }: ClaimPopupProps) {
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      className="max-w-sm"
    >
      <div className="text-center space-y-6">
        <Sparkles className="mx-auto w-12 h-12 text-yellow-400" />
        
        <div className="space-y-2">
          <p className="text-2xl font-bold text-green-300">{amount} RWRD</p>
          <p className="text-sm text-green-400">Available to claim</p>
        </div>

        <div className="bg-black/20 rounded p-4">
          <div className="flex items-center justify-center space-x-2">
            <Trophy className="w-5 h-5 text-purple-400" />
            <p className="text-sm">
              {days} day{days !== 1 ? 's' : ''} streak!
            </p>
          </div>
        </div>

        <TerminalButton
          onClick={onClose}
          className="w-full"
          icon={<Sparkles className="w-4 h-4" />}
        >
          $ claim_rewards
        </TerminalButton>
      </div>
    </Modal>
  );
}