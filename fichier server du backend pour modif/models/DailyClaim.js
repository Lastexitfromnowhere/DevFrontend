import mongoose from 'mongoose';

const rewardTransactionSchema = new mongoose.Schema({
  amount: { 
    type: Number, 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['daily', 'manual', 'adjustment', 'withdrawal'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'reversed'], 
    default: 'completed' 
  },
  reference: { type: String },
  notes: { type: String },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  processedBy: { type: String }
});

const dailyClaimSchema = new mongoose.Schema({
  walletAddress: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  totalRewardsEarned: { 
    type: Number, 
    default: 0 
  },
  availableRewards: { 
    type: Number, 
    default: 0 
  },
  lastClaimDate: { 
    type: Date, 
    default: null 
  },
  nextClaimTime: { 
    type: Date, 
    default: null 
  },
  transactions: [rewardTransactionSchema],
  metadata: {
    firstClaimDate: Date,
    lastUpdated: { 
      type: Date, 
      default: Date.now 
    },
    updatedBy: String
  }
}, { 
  timestamps: true 
});

dailyClaimSchema.index({ 
  walletAddress: 1, 
  lastClaimDate: 1,
  'transactions.timestamp': 1 
});

// Vérifie si le modèle existe déjà avant de le créer pour éviter les erreurs de redéfinition
export const DailyClaim = mongoose.models.DailyClaim || mongoose.model('DailyClaim', dailyClaimSchema, 'dailyclaims');
