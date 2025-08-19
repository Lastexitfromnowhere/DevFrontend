import express from 'express';
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import { Client, GatewayIntentBits } from 'discord.js';
import { authenticateToken } from '../middleware/auth.js';
import DiscordLink from '../models/DiscordLink.js';
import { sendMessageToDiscordChannel, sendDirectMessageToUser, assignRoleToUser, addUserToGuild } from '../utils/sendDiscordMessage.js';
import { maskWalletAddress, maskDiscordId } from '../utils/privacyUtils.js';

const router = express.Router();

// Configuration Discord OAuth2
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'https://lastexitvpn.duckdns.org/discord/callback';
const DISCORD_API_ENDPOINT = 'https://discord.com/api/v10';

// Configuration Discord Bot pour le canal news
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_NEWS_CHANNEL_ID = process.env.DISCORD_NEWS_CHANNEL_ID;

// Variables pour stocker le client Discord et les messages
let discordClient;
let newsMessages = [];

// Log des variables d'environnement pour le débogage
console.log('Variables d\'environnement Discord:', {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET: DISCORD_CLIENT_SECRET ? '***' : 'non défini',
  DISCORD_REDIRECT_URI,
  DISCORD_NEWS_CHANNEL_ID,
  NODE_ENV: process.env.NODE_ENV
});

// Fonction pour initialiser le client Discord
const initDiscordClient = async () => {
  if (discordClient) return discordClient;
  
  try {
    console.log('Initialisation du client Discord pour le canal news...');
    
    discordClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });
    
    discordClient.once('ready', async () => {
      console.log(`Bot connecté en tant que ${discordClient.user.tag}`);
      await loadNewsMessages();
    });
    
    // Écouter les nouveaux messages
    discordClient.on('messageCreate', async (message) => {
      // Si le message provient du canal news
      if (message.channel.id === DISCORD_NEWS_CHANNEL_ID) {
        console.log(`Nouveau message dans le canal news: ${message.content.substring(0, 30)}...`);
        
        // Ajouter le message à la liste
        const newsItem = {
          id: message.id,
          content: message.content,
          author: message.author.username,
          timestamp: message.createdTimestamp,
          date: new Date(message.createdTimestamp).toISOString(),
          attachments: Array.from(message.attachments.values()).map(att => ({
            url: att.url,
            name: att.name,
            contentType: att.contentType
          }))
        };
        
        // Ajouter au début et limiter la taille
        newsMessages.unshift(newsItem);
        if (newsMessages.length > 10) {
          newsMessages = newsMessages.slice(0, 10);
        }
      }
    });
    
    // Connecter le bot
    await discordClient.login(DISCORD_BOT_TOKEN);
    return discordClient;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du client Discord:', error);
    return null;
  }
};
// Fonction pour charger les messages existants
const loadNewsMessages = async () => {
  try {
    if (!discordClient || !DISCORD_NEWS_CHANNEL_ID) {
      console.error('Client Discord ou ID de canal non disponible');
      return;
    }
    
    const channel = await discordClient.channels.fetch(DISCORD_NEWS_CHANNEL_ID);
    
    if (!channel || !channel.isTextBased()) {
      console.error('Canal news non trouvé ou non accessible');
      return;
    }
    
    console.log(`Chargement des messages du canal ${channel.name}...`);
    
    const messages = await channel.messages.fetch({ limit: 10 });
    
    newsMessages = Array.from(messages.values()).map(msg => ({
      id: msg.id,
      content: msg.content,
      author: msg.author.username,
      timestamp: msg.createdTimestamp,
      date: new Date(msg.createdTimestamp).toISOString(),
      attachments: Array.from(msg.attachments.values()).map(att => ({
        url: att.url,
        name: att.name,
        contentType: att.contentType
      }))
    })).sort((a, b) => b.timestamp - a.timestamp);
    
    console.log(`${newsMessages.length} messages chargés depuis le canal news`);
  } catch (error) {
    console.error('Erreur lors du chargement des messages:', error);
  }
};

// Initialiser le client au démarrage du serveur
initDiscordClient().catch(error => {
  console.error('Erreur lors de l\'initialisation du client Discord:', error);
});

// Route pour récupérer les messages du canal news
router.get('/news', async (req, res) => {
  // Définir les en-têtes CORS pour cette route
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Gérer les requêtes OPTIONS pour le pre-flight CORS
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  try {
    // Si nous n'avons pas de messages et que le client est connecté, essayer de les charger
    if (newsMessages.length === 0 && discordClient && discordClient.isReady()) {
      await loadNewsMessages();
    }
    
    // Renvoyer les messages
    res.json({
      success: true,
      messages: newsMessages
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des messages Discord:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des messages Discord'
    });
  }
});
// Route pour initier l'authentification Discord
router.get('/auth', authenticateToken, (req, res) => {
  // Récupérer l'adresse du wallet depuis le token JWT
  const walletAddress = req.user.address || req.user.walletAddress;
  
  if (!walletAddress) {
    return res.status(401).json({
      success: false,
      message: 'Vous devez être connecté avec un wallet pour lier votre compte Discord'
    });
  }
  
  // Créer l'URL d'authentification Discord
  const state = Buffer.from(JSON.stringify({ walletAddress })).toString('base64');
  
  // Inclure le scope guilds.join pour permettre l'ajout automatique au serveur
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=identify%20guilds.join&state=${state}`;
  
  res.json({
    success: true,
    authUrl: discordAuthUrl
  });
});

// Route pour compléter la liaison Discord depuis le frontend
router.post('/complete-link', authenticateToken, async (req, res) => {
  console.log('[DEBUG DISCORD] Appel de /discord/complete-link', req.body);
  try {
    // Récupérer l'adresse du wallet depuis le token JWT
    const walletAddress = req.user.address || req.user.walletAddress;
    
    if (!walletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Vous devez être connecté avec un wallet pour lier votre compte Discord'
      });
    }
    
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Code d\'autorisation Discord manquant'
      });
    }
    
    console.log(`Tentative de liaison Discord pour le wallet ${walletAddress} avec le code ${code.substring(0, 10)}...`);
    
    // Vérifier que les variables d'environnement Discord sont définies
    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
      console.error('Variables d\'environnement Discord manquantes:', { 
        DISCORD_CLIENT_ID: !!DISCORD_CLIENT_ID, 
        DISCORD_CLIENT_SECRET: !!DISCORD_CLIENT_SECRET 
      });
      return res.status(500).json({
        success: false,
        message: 'Configuration Discord manquante sur le serveur'
      });
    }

    // Échanger le code contre un token d'accès Discord
    try {
      const tokenResponse = await fetch(`${DISCORD_API_ENDPOINT}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          client_secret: DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: DISCORD_REDIRECT_URI
        })
      });
      
      // Vérifier si la réponse est OK
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Erreur lors de l\'obtention du token Discord:', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          error: errorText
        });
        return res.status(500).json({
          success: false,
          message: `Erreur lors de l'échange du code: ${tokenResponse.status} ${tokenResponse.statusText}`
        });
      }
      
      const tokenData = await tokenResponse.json();
      
      if (!tokenData.access_token) {
        console.error('Erreur lors de l\'échange du code:', tokenData);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de l\'échange du code d\'autorisation'
        });
      }
      
      // Récupérer les informations de l'utilisateur Discord
      const userResponse = await fetch(`${DISCORD_API_ENDPOINT}/users/@me`, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      });
      
      // Vérifier si la réponse est OK
      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error('Erreur lors de la récupération des infos utilisateur:', {
          status: userResponse.status,
          statusText: userResponse.statusText,
          error: errorText
        });
        return res.status(500).json({
          success: false,
          message: `Erreur lors de la récupération des infos utilisateur: ${userResponse.status}`
        });
      }
      
      const userData = await userResponse.json();
      
      if (!userData.id) {
        console.error('Erreur lors de la récupération des informations de l\'utilisateur:', userData);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des informations de l\'utilisateur Discord'
        });
      }
      
      // Compter le nombre total d'utilisateurs pour déterminer l'ordre d'inscription
      const totalUsers = await DiscordLink.countDocuments();

      // Supprimer tous les liens existants pour ce discordId ou ce walletAddress
      await DiscordLink.deleteMany({ $or: [{ discordId: userData.id }, { walletAddress }] });

      // Créer le nouveau lien (aucun risque de doublon maintenant)
      const discordLink = await DiscordLink.create({
        walletAddress,
        discordId: userData.id,
        discordUsername: userData.username,
        discordAvatar: userData.avatar,
        registrationOrder: totalUsers + 1,
        notifyDailyClaims: true,
        roles: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      console.log(`Lien Discord créé avec succès pour ${userData.username} (${userData.id}) avec le wallet ${walletAddress}`);
      
      // LOG AVANT L'AJOUT AU SERVEUR
      console.log('[DEBUG DISCORD] Tentative d\'ajout au serveur Discord', {
        discordId: userData.id,
        accessToken: tokenData.access_token ? tokenData.access_token.slice(0, 10) + '...' : 'undefined'
      });
      const addedToGuild = await addUserToGuild(userData.id, tokenData.access_token);
      // LOG APRÈS L'AJOUT AU SERVEUR
      console.log('[DEBUG DISCORD] Résultat ajout au serveur Discord:', addedToGuild);
      if (addedToGuild) {
        console.log(`Utilisateur ${maskDiscordId(userData.id)} ajouté au serveur Discord avec succès`);
        
        // Attendre que Discord synchronise l'ajout du membre (2 secondes)
        console.log(`Attente de 2 secondes pour la synchronisation Discord...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.warn(`Impossible d'ajouter l'utilisateur ${maskDiscordId(userData.id)} au serveur Discord`);
      }
      
      // Vérifier si l'utilisateur est parmi les 5000 premiers pour le rôle Early Contributor
      let isEarlyContributor = false;
      if (discordLink.registrationOrder <= 5000) {
        console.log(`L'utilisateur ${userData.username} est parmi les 5000 premiers (position: ${discordLink.registrationOrder})`);
        // Attribuer le rôle "Early Contributor"
        const roleAssigned = await assignRoleToUser(userData.id, "Early Contributor");
        
        if (roleAssigned) {
          console.log(`Rôle Early Contributor attribué à ${userData.username}`);
          // Ajouter le rôle à la liste des rôles de l'utilisateur
          discordLink.roles.push("Early Contributor");
          await discordLink.save();
          isEarlyContributor = true;
          
          // Envoyer un message privé à l'utilisateur
          await sendDirectMessageToUser(userData.id, `?? **Congratulations!** As one of our first 5,000 users, you've been granted the **Early Contributor** role in our Discord server. Thank you for your early support of our decentralized VPN network!`);
        }
      }
      
      // DEBUG : Avant envoi message de LIAGE canal Discord
      console.log('[DEBUG LIAGE] Avant envoi message canal Discord', {
        walletAddress,
        discordUsername: userData.username,
        discordId: userData.id
      });
      try {
        const discordResponse = await sendMessageToDiscordChannel(`?? Le wallet \`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}\` a lié son compte Discord \`${userData.username}\` (ID: ${userData.id.slice(0, 3)}***${userData.id.slice(-2)})`);
        console.log('[DEBUG LIAGE] Après envoi message canal Discord, réponse :', discordResponse);
      } catch (err) {
        console.error('[DEBUG LIAGE] Erreur lors de l\'envoi du message canal Discord:', err);
      }

      return res.json({
        success: true,
        message: 'Compte Discord lié avec succès',
        isEarlyContributor
      });
      
    } catch (error) {
      console.error('[DEBUG DISCORD] Erreur dans /discord/complete-link:', error);
      // Gestion spécifique de l'erreur de clé dupliquée MongoDB (E11000)
      if (error && (error.code === 11000 || error.message?.includes('E11000'))) {
        return res.status(400).json({
          success: false,
          message: 'Ce compte Discord est déjà lié à un wallet ou ce wallet est déjà lié à un autre compte Discord.'
        });
      }
      console.error('Erreur lors de la liaison Discord:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la liaison Discord: ' + (error.message || 'Erreur inconnue')
      });
    }
  } catch (error) {
    console.error('[DEBUG DISCORD] Erreur dans /discord/complete-link (global):', error);
    console.error('Erreur générale lors de la liaison Discord:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la liaison Discord'
    });
  }
});
// Route pour vérifier le statut de liaison Discord (avec authentification)
router.get('/link-status', authenticateToken, async (req, res) => {
  try {
    const walletAddress = req.user.address || req.user.walletAddress;
    
    if (!walletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Vous devez être connecté avec un wallet pour accéder à cette ressource'
      });
    }
    
    // Vérifier toutes les liaisons existantes pour ce wallet
    const discordLink = await DiscordLink.findOne({ walletAddress });
    
    if (!discordLink) {
      return res.json({
        linked: false,
        discordUsername: null,
        discordAvatar: null,
        discordId: null,
        notifyDailyClaims: false,
        isEarlyContributor: false,
        registrationOrder: null
      });
    }
    
    // Déterminer si l'utilisateur est un early contributor (parmi les 5000 premiers)
    const isEarlyContributor = discordLink.registrationOrder <= 5000;
    
    res.json({
      linked: true,
      discordUsername: discordLink.discordUsername,
      discordAvatar: discordLink.discordAvatar,
      discordId: discordLink.discordId,
      notifyDailyClaims: discordLink.notifyDailyClaims !== undefined ? discordLink.notifyDailyClaims : true,
      isEarlyContributor,
      registrationOrder: discordLink.registrationOrder
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du statut Discord:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut Discord'
    });
  }
});

// Route pour supprimer le lien entre un wallet et un compte Discord
router.delete('/link', authenticateToken, async (req, res) => {
  try {
    const walletAddress = req.user.address || req.user.walletAddress;
    
    if (!walletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Vous devez être connecté avec un wallet pour accéder à cette ressource'
      });
    }
    
    const discordLink = await DiscordLink.findOne({ walletAddress });
    
    if (!discordLink) {
      return res.status(404).json({
        success: false,
        message: 'Aucun compte Discord lié à ce wallet'
      });
    }
    const discordUsername = discordLink.discordUsername;
    await DiscordLink.deleteOne({ walletAddress });
    // DEBUG : Avant envoi message de DELIAGE canal Discord
    console.log('[DEBUG DELIAGE] Avant envoi message canal Discord', {
      walletAddress,
      discordUsername
    });
    await sendMessageToDiscordChannel(`? Le wallet \`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}\` a supprimé son lien avec le compte Discord \`${discordUsername}\``);
    console.log('[DEBUG DELIAGE] Après envoi message canal Discord');
    res.json({
      success: true,
      message: 'Lien Discord supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du lien Discord:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du lien Discord'
    });
  }
});

// Route pour activer/désactiver les notifications de daily claims
router.post('/notifications/daily-claims', authenticateToken, async (req, res) => {
  try {
    const walletAddress = req.user.address || req.user.walletAddress;
    const { enabled } = req.body;
    
    if (enabled === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Le paramètre "enabled" est requis'
      });
    }
    
    if (!walletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Vous devez être connecté avec un wallet pour accéder à cette ressource'
      });
    }
    
    const discordLink = await DiscordLink.findOne({ walletAddress });
    
    if (!discordLink) {
      return res.status(404).json({
        success: false,
        message: 'Aucun compte Discord lié à ce wallet'
      });
    }
    
    // Mettre à jour les préférences de notification
    discordLink.notifyDailyClaims = enabled;
    await discordLink.save();
    
    // Envoyer un message privé à l'utilisateur pour confirmer
    let dmFailed = false;
    if (enabled) {
      const dmResult = await sendDirectMessageToUser(discordLink.discordId, `?? You have **enabled** daily claim notifications. You will now receive a private message when your daily rewards are available to claim.`);
      if (!dmResult) dmFailed = true;
    } else {
      const dmResult = await sendDirectMessageToUser(discordLink.discordId, `?? You have **disabled** daily claim notifications. You will no longer receive private messages about daily claims.`);
      if (!dmResult) dmFailed = true;
    }

    res.json({
      success: true,
      message: enabled ? 'Notifications de daily claims activées' : 'Notifications de daily claims désactivées',
      notifyDailyClaims: enabled,
      dmFailed: dmFailed
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des préférences de notification:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des préférences de notification'
    });
  }
});

// Route pour vérifier si l'utilisateur est parmi les 5000 premiers
router.get('/early-contributor', authenticateToken, async (req, res) => {
  try {
    const walletAddress = req.user.address || req.user.walletAddress;
    
    if (!walletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Vous devez être connecté avec un wallet pour accéder à cette ressource'
      });
    }
    
    const discordLink = await DiscordLink.findOne({ walletAddress });
    
    if (!discordLink) {
      return res.status(404).json({
        success: false,
        message: 'Aucun compte Discord lié à ce wallet',
        isEarlyContributor: false
      });
    }
    
    const isEarlyContributor = discordLink.registrationOrder <= 5000;
    
    res.json({
      success: true,
      isEarlyContributor,
      registrationOrder: discordLink.registrationOrder,
      roles: discordLink.roles || []
    });
  } catch (error) {
    console.error('Erreur lors de la vérification du statut de contributeur précoce:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du statut de contributeur précoce'
    });
  }
});

// Route publique pour vérifier la santé du module Discord
router.get('/status', (req, res) => {
  res.json({ success: true, message: 'Module Discord opérationnel' });
});

export default router;
