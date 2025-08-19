import express from 'express';
const router = express.Router();
import mongoose from 'mongoose';
import { authenticateToken } from '../middleware/auth.js';
import { sendMessageToDiscordChannel, sendDirectMessageToUser } from '../utils/sendDiscordMessage.js';
import { maskWalletAddress, maskDiscordId } from '../utils/privacyUtils.js';

// Importer le modèle DiscordLink pour récupérer les informations Discord
let DiscordLink;
try {
  DiscordLink = mongoose.model('DiscordLink');
} catch (error) {
  DiscordLink = mongoose.model('DiscordLink', mongoose.Schema({
    walletAddress: { type: String, required: true, unique: true, index: true },
    discordId: { type: String, required: true, unique: true, index: true },
    discordUsername: { type: String, required: true },
    discordAvatar: { type: String, default: null },
    registrationOrder: { type: Number, index: true },
    notifyDailyClaims: { type: Boolean, default: true },
    lastNotified: { type: Date, default: null },
    roles: { type: [String], default: [] }
  }));
}

// Schéma pour les réclamations quotidiennes
const DailyClaimSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    index: true
  },
  claimHistory: [{
    amount: Number,
    timestamp: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'pending'],
      default: 'success'
    }
  }],
  lastClaimDate: {
    type: Date,
    default: null
  }
});

// Créer le modèle s'il n'existe pas déjà
let DailyClaim;
try {
  DailyClaim = mongoose.model('DailyClaim');
} catch (error) {
  DailyClaim = mongoose.model('DailyClaim', DailyClaimSchema);
}

// Configuration des récompenses
const DAILY_REWARD_AMOUNT = 0.5; // Montant de base des récompenses quotidiennes
const CLAIM_COOLDOWN_HOURS = 24; // Heures entre chaque réclamation

// Middleware pour vérifier l'authentification par wallet (utilise authenticateToken)
const checkWalletAuth = (req, res, next) => {
  if (req.user && req.user.walletAddress) {
    // Si le token JWT contient directement walletAddress
    req.walletAddress = req.user.walletAddress;
    console.log(`🔑 Authentification par token JWT (walletAddress): ${req.walletAddress}`);
    return next();
  } else if (req.user && req.user.address) {
    // Si le token JWT contient address
    req.walletAddress = req.user.address;
    console.log(`🔑 Authentification par token JWT (address): ${req.walletAddress}`);
    return next();
  }

  let walletAddress = req.headers['x-wallet-address'] || req.body.walletAddress || req.body.clientWalletAddress;

  const authHeader = req.headers['authorization'];
  if (!walletAddress && authHeader && authHeader.startsWith('Bearer ')) {
    // Ne pas utiliser le JWT complet comme adresse de wallet
    try {
      // Tenter de décoder le JWT pour extraire l'adresse du wallet
      const token = authHeader.substring(7);
      const base64Payload = token.split('.')[1];
      const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
      if (payload.walletAddress) {
        walletAddress = payload.walletAddress;
        console.log(`🔑 Adresse extraite du JWT: ${walletAddress}`);
      }
    } catch (error) {
      console.error(`❌ Erreur lors du décodage du JWT: ${error.message}`);
    }
  }

  if (!walletAddress) {
    return res.status(401).json({
      success: false,
      message: 'Adresse de wallet non fournie'
    });
  }

  req.walletAddress = walletAddress;
  console.log(`🔑 Authentification par wallet: ${req.walletAddress}`);
  next();
};

// Fonction pour envoyer une notification Discord à l'utilisateur si ses récompenses sont disponibles
async function notifyUserIfClaimAvailable(walletAddress, canClaim, nextClaimTime) {
  try {
    // Vérifier si l'utilisateur a lié son compte Discord
    const discordLink = await DiscordLink.findOne({ walletAddress });
    
    if (!discordLink || !discordLink.notifyDailyClaims) {
      return; // L'utilisateur n'a pas lié son compte Discord ou a désactivé les notifications
    }
    
    // Vérifier si nous avons déjà notifié l'utilisateur aujourd'hui
    const now = new Date();
    const lastNotified = discordLink.lastNotified || new Date(0);
    const hoursSinceLastNotification = (now - lastNotified) / (1000 * 60 * 60);
    
    // Ne notifier que si la dernière notification date de plus de 20 heures
    if (hoursSinceLastNotification < 20) {
      return;
    }
    
    if (canClaim) {
      // Envoyer un message privé pour informer que les récompenses sont disponibles
      await sendDirectMessageToUser(
        discordLink.discordId,
        `🎉 **Daily Rewards Available!** Your daily claim of ${DAILY_REWARD_AMOUNT} RWRD is now available. Visit our dashboard to claim it!`
      );
      
      // Mettre à jour la date de dernière notification
      discordLink.lastNotified = now;
      await discordLink.save();
    }
  } catch (error) {
    console.error(`❌ Erreur lors de l'envoi de la notification Discord: ${error.message}`);
  }
}

// Endpoint pour récupérer les informations de récompenses quotidiennes
router.get('/dailyClaims', authenticateToken, checkWalletAuth, async (req, res) => {
  try {
    const walletAddress = req.walletAddress;
    let userClaim = await DailyClaim.findOne({ walletAddress });

    if (!userClaim) {
      userClaim = new DailyClaim({
        walletAddress,
        claimHistory: [],
        lastClaimDate: null
      });
      await userClaim.save();
    }

    const now = new Date();
    const lastClaim = userClaim.lastClaimDate ? new Date(userClaim.lastClaimDate) : null;

    let canClaim = true;
    let nextClaimTime = null;

    if (lastClaim) {
      const hoursSinceLastClaim = (now - lastClaim) / (1000 * 60 * 60);
      canClaim = hoursSinceLastClaim >= CLAIM_COOLDOWN_HOURS;

      if (!canClaim) {
        const remainingHours = CLAIM_COOLDOWN_HOURS - hoursSinceLastClaim;
        const nextClaimDate = new Date(lastClaim);
        nextClaimDate.setHours(nextClaimDate.getHours() + CLAIM_COOLDOWN_HOURS);
        nextClaimTime = nextClaimDate.toISOString();
      }
    }

    const availableRewards = canClaim ? DAILY_REWARD_AMOUNT : 0;
    
    // Envoyer une notification Discord si l'utilisateur peut réclamer ses récompenses
    await notifyUserIfClaimAvailable(walletAddress, canClaim, nextClaimTime);
    
    res.json({
      success: true,
      availableRewards,
      lastClaimDate: userClaim.lastClaimDate,
      canClaim,
      nextClaimTime,
      claimHistory: userClaim.claimHistory
    });
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération des récompenses quotidiennes: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Impossible de récupérer les informations de récompenses quotidiennes'
    });
  }
});

// Endpoint pour réclamer les récompenses quotidiennes
router.post('/dailyClaims/claim', authenticateToken, checkWalletAuth, async (req, res) => {
  try {
    const walletAddress = req.walletAddress;

    console.log(`🔥 Tentative de réclamation pour le wallet: ${walletAddress}`);

    let userClaim = await DailyClaim.findOne({ walletAddress });

    if (!userClaim) {
      console.log(`🌟 Création d'un nouveau profil de récompenses pour ${walletAddress}`);
      userClaim = new DailyClaim({
        walletAddress,
        claimHistory: [],
        lastClaimDate: null
      });
      await userClaim.save();
    }

    const now = new Date();
    const lastClaim = userClaim.lastClaimDate ? new Date(userClaim.lastClaimDate) : null;

    if (lastClaim) {
      const hoursSinceLastClaim = (now - lastClaim) / (1000 * 60 * 60);

      if (hoursSinceLastClaim < CLAIM_COOLDOWN_HOURS) {
        const remainingHours = CLAIM_COOLDOWN_HOURS - hoursSinceLastClaim;
        const nextClaimDate = new Date(lastClaim);
        nextClaimDate.setHours(nextClaimDate.getHours() + CLAIM_COOLDOWN_HOURS);

        return res.status(400).json({
          success: false,
          message: `Vous pourrez réclamer des récompenses dans ${Math.ceil(remainingHours)} heures`,
          nextClaimTime: nextClaimDate.toISOString()
        });
      }
    }

    userClaim.claimHistory.unshift({
      amount: DAILY_REWARD_AMOUNT,
      timestamp: now,
      status: 'success'
    });

    userClaim.lastClaimDate = now;

    const nextClaimDate = new Date(now);
    nextClaimDate.setHours(nextClaimDate.getHours() + CLAIM_COOLDOWN_HOURS);

    await userClaim.save();

    // Rechercher si l'utilisateur a lié son compte Discord
    const discordLink = await DiscordLink.findOne({ walletAddress });
    
    // 👉 Envoi d'un message dans Discord après succès du claim
    if (discordLink) {
      // Utiliser le nom d'utilisateur Discord si disponible
      await sendMessageToDiscordChannel(`🎉 **${discordLink.discordUsername}** vient de réclamer son daily claim de ${DAILY_REWARD_AMOUNT} RWRD !`);
      
      // Envoyer également un message privé de confirmation
      await sendDirectMessageToUser(
        discordLink.discordId,
        `🎉 **Claim Successful!** You've successfully claimed your daily reward of ${DAILY_REWARD_AMOUNT} RWRD. Your next claim will be available in 24 hours.`
      );
      
      // Mettre à jour la date de dernière notification
      discordLink.lastNotified = new Date();
      await discordLink.save();
    } else {
      // S'assurer que walletAddress est une chaîne de caractères valide
      if (walletAddress && typeof walletAddress === 'string' && walletAddress.length > 8) {
        // Utiliser une version masquée de l'adresse du wallet si pas de compte Discord lié
        const maskedWallet = maskWalletAddress(walletAddress);
        await sendMessageToDiscordChannel(`🎉 L'utilisateur avec le wallet \`${maskedWallet}\` vient de réclamer son daily claim de ${DAILY_REWARD_AMOUNT} RWRD !`);
      } else {
        // Fallback si l'adresse du wallet n'est pas valide
        await sendMessageToDiscordChannel(`🎉 Un utilisateur vient de réclamer son daily claim de ${DAILY_REWARD_AMOUNT} RWRD !`);
      }
    }

    res.json({
      success: true,
      message: 'Récompenses quotidiennes réclamées avec succès',
      claimedAmount: DAILY_REWARD_AMOUNT,
      nextClaimTime: nextClaimDate.toISOString()
    });
  } catch (error) {
    console.error(`❌ Erreur lors de la réclamation des récompenses: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Impossible de réclamer les récompenses quotidiennes'
    });
  }
});

export default router;
