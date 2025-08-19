import { DailyClaim } from '../models/DailyClaim.js';
import DiscordLink from '../models/DiscordLink.js';
import mongoose from 'mongoose';
import { sendDirectMessageToUser } from '../utils/sendDiscordMessage.js';

const DAILY_REWARD_AMOUNT = 1.0;
const CLAIM_COOLDOWN_HOURS = 24;

// Fonction utilitaire pour créer une transaction
const createTransaction = (type, amount, reference = null, notes = null, processedBy = 'system') => {
  return {
    amount,
    type,
    reference,
    notes,
    status: 'completed',
    timestamp: new Date(),
    processedBy
  };
};

// Fonction pour notifier l'utilisateur sur Discord
const notifyUserOnDiscord = async (walletAddress, rewardAmount, nextClaimTime) => {
  try {
    // Trouver le lien Discord de l'utilisateur
    const discordLink = await DiscordLink.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!discordLink || !discordLink.notifyDailyClaims) {
      return; // Pas de notification si l'utilisateur n'est pas sur Discord ou a désactivé les notifications
    }

    // Formater la date de la prochaine réclamation
    const nextClaimStr = nextClaimTime.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Créer le message de notification
    const message = `🎉 Félicitations ! Vous avez reçu ${rewardAmount} tokens en récompense quotidienne.\n` +
                   `⏳ Prochaine réclamation possible : ${nextClaimStr}`;

    // Envoyer le message privé
    await sendDirectMessageToUser(discordLink.discordId, message);
    
    // Mettre à jour la date de dernière notification
    discordLink.lastNotified = new Date();
    await discordLink.save();
    
    console.log(`Notification Discord envoyée à ${discordLink.discordUsername}`);
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification Discord:', error);
  }
};

export const getDailyClaimStatus = async (walletAddress) => {
  try {
    let claim = await DailyClaim.findOne({ walletAddress }) || 
      new DailyClaim({ 
        walletAddress, 
        availableRewards: 0,
        totalRewardsEarned: 0,
        transactions: []
      });
    
    const now = new Date();
    let canClaim = true;
    let nextClaimTime = null;

    if (claim.lastClaimDate) {
      const lastClaim = new Date(claim.lastClaimDate);
      const hoursSinceLastClaim = (now - lastClaim) / (1000 * 60 * 60);
      canClaim = hoursSinceLastClaim >= CLAIM_COOLDOWN_HOURS;
      if (!canClaim) {
        nextClaimTime = new Date(lastClaim.getTime() + (CLAIM_COOLDOWN_HOURS * 60 * 60 * 1000));
      }
    }

    return {
      success: true,
      availableRewards: claim.availableRewards,
      totalRewardsEarned: claim.totalRewardsEarned,
      lastClaimDate: claim.lastClaimDate,
      canClaim,
      nextClaimTime,
      transactionCount: claim.transactions?.length || 0
    };
  } catch (error) {
    console.error('Error getting daily claim status:', error);
    throw new Error('Failed to get daily claim status');
  }
};

export const processDailyClaim = async (walletAddress, adminId = 'system') => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let claim = await DailyClaim.findOne({ walletAddress }).session(session);
    const isNewClaim = !claim;
    
    if (isNewClaim) {
      claim = new DailyClaim({ 
        walletAddress, 
        availableRewards: 0,
        totalRewardsEarned: 0,
        transactions: [],
        metadata: {
          firstClaimDate: new Date()
        }
      });
    }

    const now = new Date();
    
    // Vérifier si l'utilisateur peut réclamer
    if (claim.lastClaimDate) {
      const lastClaim = new Date(claim.lastClaimDate);
      const hoursSinceLastClaim = (now - lastClaim) / (1000 * 60 * 60);
      
      if (hoursSinceLastClaim < CLAIM_COOLDOWN_HOURS) {
        const nextClaimTime = new Date(lastClaim.getTime() + (CLAIM_COOLDOWN_HOURS * 60 * 60 * 1000));
        return { 
          success: false, 
          message: `You can claim again in ${Math.ceil(CLAIM_COOLDOWN_HOURS - hoursSinceLastClaim)} hours`, 
          nextClaimTime 
        };
      }
    }

    // Créer la transaction
    const transaction = createTransaction(
      'daily', 
      DAILY_REWARD_AMOUNT, 
      null, 
      'Daily reward claim',
      adminId
    );

    // Mettre à jour les récompenses
    claim.availableRewards += DAILY_REWARD_AMOUNT;
    claim.totalRewardsEarned += DAILY_REWARD_AMOUNT;
    claim.lastClaimDate = now;
    claim.nextClaimTime = new Date(now.getTime() + (CLAIM_COOLDOWN_HOURS * 60 * 60 * 1000));
    
    // Ajouter la transaction à l'historique
    if (!claim.transactions) claim.transactions = [];
    claim.transactions.push(transaction);
    
    // Mettre à jour les métadonnées
    if (!claim.metadata) claim.metadata = {};
    claim.metadata.lastUpdated = now;
    claim.metadata.updatedBy = adminId;

    await claim.save({ session });
    await session.commitTransaction();
    session.endSession();

    // Envoyer une notification Discord en arrière-plan (ne pas attendre la fin)
    notifyUserOnDiscord(walletAddress, DAILY_REWARD_AMOUNT, claim.nextClaimTime)
      .catch(err => console.error('Erreur lors de la notification Discord:', err));

    return {
      success: true,
      message: 'Reward claimed successfully',
      reward: DAILY_REWARD_AMOUNT,
      availableRewards: claim.availableRewards,
      totalRewardsEarned: claim.totalRewardsEarned,
      nextClaimTime: claim.nextClaimTime,
      transactionId: transaction._id
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error processing daily claim:', error);
    throw new Error('Failed to process daily claim');
  }
};

// Fonction pour ajuster manuellement les récompenses
export const adjustRewards = async (walletAddress, amount, notes, adminId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let claim = await DailyClaim.findOne({ walletAddress }).session(session) || 
      new DailyClaim({ 
        walletAddress, 
        availableRewards: 0,
        totalRewardsEarned: 0,
        transactions: [],
        metadata: {
          firstClaimDate: new Date()
        }
      });

    const now = new Date();
    const transactionType = amount >= 0 ? 'manual' : 'adjustment';
    
    // Créer la transaction
    const transaction = createTransaction(
      transactionType,
      amount,
      null,
      notes || (amount >= 0 ? 'Ajustement manuel' : 'Ajustement négatif'),
      adminId
    );

    // Mettre à jour les récompenses
    claim.availableRewards += amount;
    if (amount > 0) {
      claim.totalRewardsEarned += amount;
    }
    
    // Ajouter la transaction à l'historique
    if (!claim.transactions) claim.transactions = [];
    claim.transactions.push(transaction);
    
    // Mettre à jour les métadonnées
    if (!claim.metadata) claim.metadata = {};
    claim.metadata.lastUpdated = now;
    claim.metadata.updatedBy = adminId;
    claim.metadata.lastAdjustment = {
      amount,
      notes,
      processedBy: adminId
    };

    await claim.save({ session });
    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      message: 'Rewards adjusted successfully',
      availableRewards: claim.availableRewards,
      totalRewardsEarned: claim.totalRewardsEarned,
      transactionId: transaction._id
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error adjusting rewards:', error);
    throw new Error('Failed to adjust rewards');
  }
};

// Fonction pour obtenir l'historique complet
export const getTransactionHistory = async (walletAddress, page = 1, limit = 10) => {
  try {
    const skip = (page - 1) * limit;
    
    const claim = await DailyClaim.findOne({ walletAddress })
      .select('transactions')
      .slice('transactions', [skip, limit])
      .sort({ 'transactions.timestamp': -1 });
    
    if (!claim) {
      return {
        success: true,
        transactions: [],
        total: 0,
        page,
        totalPages: 0
      };
    }

    const total = claim.transactions?.length || 0;
    const transactions = claim.transactions || [];
    
    return {
      success: true,
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Error getting transaction history:', error);
    throw new Error('Failed to get transaction history');
  }
};
