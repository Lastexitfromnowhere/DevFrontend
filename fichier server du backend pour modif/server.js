import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import { exec } from 'child_process';
import jwt from 'jsonwebtoken';
import vpnRoutes from './routes/vpn.js';
import WireGuardConfig from './models/WireGuardConfig.js';
import * as wireguardUtils from './utils/wireguardUtils.js';
import * as dhtUtils from './utils/dhtUtils.js';
import dhtRoutes from './routes/dht.multi.mjs';
import { authenticateToken } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import rewardsRoutes from './routes/rewards.mjs';
import discordRoutes from './routes/discord.js';
import { getIoRedisClient } from './config/redis.js';
import DiscordLink from './models/DiscordLink.js';
import fetch from 'node-fetch';

dotenv.config();

// Log des variables d'environnement pour le débogage
console.log('Variables d\'environnement chargées:', {
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET ? '***' : 'non défini',
  DISCORD_REDIRECT_URI: process.env.DISCORD_REDIRECT_URI,
  NODE_ENV: process.env.NODE_ENV
});

// Récupérer le client Redis depuis le module centralisé
const redisClient = getIoRedisClient();
redisClient.on('connect', () => {
  console.log('Connected to Redis successfully');
});
redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});

const app = express();
const PORT = process.env.PORT || 10000;

// Configuration CORS pour autoriser les requêtes depuis les domaines spécifiques
const corsOptions = {
  origin: [
    'https://wind-frontend-rosy.vercel.app',
    'https://www.lastparadox.xyz',
    'https://lastparadox.xyz',
    'https://wind-frontend-git-canbroke-last-exits-projects.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-wallet-address'],
  exposedHeaders: ['Access-Control-Allow-Origin'],
  credentials: true,
  preflightContinue: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Middleware pour ajouter les en-têtes CORS à toutes les réponses
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://wind-frontend-rosy.vercel.app',
    'https://www.lastparadox.xyz',
    'https://lastparadox.xyz',
    'https://wind-frontend-git-canbroke-last-exits-projects.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-wallet-address');
  res.header('Access-Control-Expose-Headers', 'Access-Control-Allow-Origin');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Schema MongoDB pour les associations Google-Wallet
const googleWalletSchema = new mongoose.Schema({
  googleUserId: { type: String, required: true, unique: true },
  userEmail: { type: String, required: true },
  userName: { type: String, required: true },
  walletAddress: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const GoogleWallet = mongoose.model('GoogleWallet', googleWalletSchema);

// Schema MongoDB pour les utilisateurs Solana
const solanaUserSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, unique: true },
  publicKey: { type: String, required: true },
  userType: { type: String, enum: ['google', 'direct'], default: 'direct' },
  googleUserId: { type: String, default: null }, // Référence vers GoogleWallet si applicable
  
  // Données utilisateur
  displayName: { type: String, default: null },
  email: { type: String, default: null },
  avatar: { type: String, default: null },
  
  // Statistiques et préférences
  totalRewardsClaimed: { type: Number, default: 0 },
  consecutiveDays: { type: Number, default: 0 },
  lastClaimDate: { type: Date, default: null },
  registrationDate: { type: Date, default: Date.now },
  lastLoginDate: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  
  // Préférences utilisateur
  preferences: {
    notifications: { type: Boolean, default: true },
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
    language: { type: String, default: 'fr' }
  },
  
  // Métadonnées
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const SolanaUser = mongoose.model('SolanaUser', solanaUserSchema);

// POST /auth/google-wallet-association - Sauvegarder l'association
app.post('/auth/google-wallet-association', async (req, res) => {
  try {
    const { googleUserId, userEmail, userName, walletAddress } = req.body;

    if (!googleUserId || !userEmail || !userName || !walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis'
      });
    }

    // Vérifier si l'association existe déjà
    let existingAssociation = await GoogleWallet.findOne({ googleUserId });

    if (existingAssociation) {
      // Mettre à jour l'association existante
      existingAssociation.userEmail = userEmail;
      existingAssociation.userName = userName;
      existingAssociation.walletAddress = walletAddress;
      existingAssociation.updatedAt = new Date();
      
      await existingAssociation.save();
      
      return res.json({
        success: true,
        message: 'Association mise à jour',
        data: existingAssociation
      });
    } else {
      // Créer une nouvelle association
      const newAssociation = new GoogleWallet({
        googleUserId,
        userEmail,
        userName,
        walletAddress,
        createdAt: new Date()
      });

      await newAssociation.save();

      return res.json({
        success: true,
        message: 'Association créée',
        data: newAssociation
      });
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'association Google-Wallet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// GET /auth/google-wallet-association/:googleUserId - Récupérer l'association
app.get('/auth/google-wallet-association/:googleUserId', async (req, res) => {
  try {
    const { googleUserId } = req.params;

    if (!googleUserId) {
      return res.status(400).json({
        success: false,
        message: 'Google User ID requis'
      });
    }

    const association = await GoogleWallet.findOne({ googleUserId });

    if (!association) {
      return res.status(404).json({
        success: false,
        message: 'Association non trouvée'
      });
    }

    res.json({
      success: true,
      data: {
        googleUserId: association.googleUserId,
        userEmail: association.userEmail,
        userName: association.userName,
        walletAddress: association.walletAddress,
        createdAt: association.createdAt,
        updatedAt: association.updatedAt
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'association Google-Wallet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// POST /auth/solana-user - Créer ou mettre à jour un utilisateur Solana
app.post('/auth/solana-user', async (req, res) => {
  try {
    const { walletAddress, publicKey, userType, googleUserId, displayName, email } = req.body;

    if (!walletAddress || !publicKey) {
      return res.status(400).json({
        success: false,
        message: 'walletAddress et publicKey sont requis'
      });
    }

    // Vérifier si l'utilisateur existe déjà
    let existingUser = await SolanaUser.findOne({ walletAddress });

    if (existingUser) {
      // Mettre à jour l'utilisateur existant
      existingUser.publicKey = publicKey;
      existingUser.userType = userType || existingUser.userType;
      existingUser.googleUserId = googleUserId || existingUser.googleUserId;
      existingUser.displayName = displayName || existingUser.displayName;
      existingUser.email = email || existingUser.email;
      existingUser.lastLoginDate = new Date();
      existingUser.updatedAt = new Date();
      
      await existingUser.save();
      
      return res.json({
        success: true,
        message: 'Utilisateur mis à jour',
        data: existingUser
      });
    } else {
      // Créer un nouvel utilisateur
      const newUser = new SolanaUser({
        walletAddress,
        publicKey,
        userType: userType || 'direct',
        googleUserId: googleUserId || null,
        displayName: displayName || null,
        email: email || null,
        registrationDate: new Date(),
        lastLoginDate: new Date()
      });

      await newUser.save();

      return res.json({
        success: true,
        message: 'Utilisateur créé',
        data: newUser
      });
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'utilisateur Solana:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// GET /auth/solana-user/:walletAddress - Récupérer un utilisateur Solana
app.get('/auth/solana-user/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address requis'
      });
    }

    const user = await SolanaUser.findOne({ walletAddress });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Mettre à jour la dernière connexion
    user.lastLoginDate = new Date();
    await user.save();

    res.json({
      success: true,
      data: {
        walletAddress: user.walletAddress,
        publicKey: user.publicKey,
        userType: user.userType,
        googleUserId: user.googleUserId,
        displayName: user.displayName,
        email: user.email,
        totalRewardsClaimed: user.totalRewardsClaimed,
        consecutiveDays: user.consecutiveDays,
        lastClaimDate: user.lastClaimDate,
        registrationDate: user.registrationDate,
        lastLoginDate: user.lastLoginDate,
        isActive: user.isActive,
        preferences: user.preferences,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur Solana:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// PUT /auth/solana-user/:walletAddress/preferences - Mettre à jour les préférences
app.put('/auth/solana-user/:walletAddress/preferences', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { preferences } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address requis'
      });
    }

    const user = await SolanaUser.findOne({ walletAddress });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Mettre à jour les préférences
    user.preferences = { ...user.preferences, ...preferences };
    user.updatedAt = new Date();
    
    await user.save();

    res.json({
      success: true,
      message: 'Préférences mises à jour',
      data: user.preferences
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des préférences:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// POST /auth/solana-user/:walletAddress/sync-rewards - Synchroniser les rewards avec les données existantes
app.post('/auth/solana-user/:walletAddress/sync-rewards', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { totalRewardsClaimed, consecutiveDays, lastClaimDate } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address requis'
      });
    }

    const user = await SolanaUser.findOne({ walletAddress });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Synchroniser les données de rewards
    if (totalRewardsClaimed !== undefined) user.totalRewardsClaimed = totalRewardsClaimed;
    if (consecutiveDays !== undefined) user.consecutiveDays = consecutiveDays;
    if (lastClaimDate !== undefined) user.lastClaimDate = new Date(lastClaimDate);
    user.updatedAt = new Date();
    
    await user.save();

    res.json({
      success: true,
      message: 'Rewards synchronisés',
      data: {
        totalRewardsClaimed: user.totalRewardsClaimed,
        consecutiveDays: user.consecutiveDays,
        lastClaimDate: user.lastClaimDate
      }
    });
  } catch (error) {
    console.error('Erreur lors de la synchronisation des rewards:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// Ajout des routes d'authentification
app.use('/auth', authRoutes);

// Ajout des routes Discord
app.use('/discord', discordRoutes);

// Route directe pour /discord/link (sans préfixe /api)
app.get('/discord/link', (req, res) => {
  // Définir les en-têtes CORS explicitement
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-wallet-address');
  
  // Extraire le token d'authentification
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(200).json({
      success: true,
      isLinked: false,
      message: 'Aucun token d\'authentification fourni, impossible de vérifier le statut de liaison Discord',
      debug: {
        authHeader: authHeader || 'Non fourni',
        token: 'Non fourni',
        serverTime: new Date().toISOString()
      }
    });
  }
  
  try {
    // Vérifier le token
    jwt.verify(token, process.env.JWT_SECRET || '33355ba6c0a14078bc8c17d3d05982e0e21619e1bebdeca51d039f06867d5f30d46ace3f01afd1d846a09d7d735a9589303b3e01baebd99d34672233f13967cb', async (err, user) => {
      if (err) {
        return res.status(200).json({
          success: true,
          isLinked: false,
          message: 'Token d\'authentification invalide',
          debug: {
            error: err.message,
            token: token ? `${token.substring(0, 10)}...` : 'Non fourni',
            serverTime: new Date().toISOString()
          }
        });
      }
      
      const walletAddress = user.address || user.walletAddress;
      
      if (!walletAddress) {
        return res.status(200).json({
          success: true,
          isLinked: false,
          message: 'Adresse de wallet non trouvée dans le token',
          debug: {
            user: JSON.stringify(user),
            token: token ? `${token.substring(0, 10)}...` : 'Non fourni',
            serverTime: new Date().toISOString()
          }
        });
      }
      
      // Chercher si le wallet est lié à un compte Discord
      const discordLink = await DiscordLink.findOne({ walletAddress: walletAddress.toLowerCase() });
      
      if (!discordLink) {
        return res.status(200).json({
          success: true,
          isLinked: false,
          message: 'Aucun compte Discord lié à ce wallet',
          debug: {
            walletAddress,
            serverTime: new Date().toISOString()
          }
        });
      }
      
      return res.status(200).json({
        success: true,
        isLinked: true,
        discordUsername: discordLink.discordUsername,
        discordId: discordLink.discordId,
        message: 'Compte Discord lié avec succès',
        debug: {
          walletAddress,
          discordId: discordLink.discordId,
          serverTime: new Date().toISOString()
        }
      });
    });
  } catch (error) {
    console.error('Erreur lors de la vérification du lien Discord:', error);
    return res.status(500).json({
      success: false,
      isLinked: false,
      message: 'Erreur serveur lors de la vérification du lien Discord',
      debug: {
        error: error.message,
        stack: error.stack,
        serverTime: new Date().toISOString()
      }
    });
  }
});

// Route directe pour le diagnostic Discord sans préfixe /api
app.get('/discord/link-debug', (req, res) => {
  // Définir les en-têtes CORS explicitement
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  res.json({
    success: true,
    message: 'Route de diagnostic Discord directe fonctionnelle',
    serverTime: new Date().toISOString(),
    discordConfig: {
      clientId: process.env.DISCORD_CLIENT_ID,
      redirectUri: process.env.DISCORD_REDIRECT_URI
    }
  });
});

// Route directe pour le diagnostic de la route /api/discord/link
app.get('/api/discord/link-debug', (req, res) => {
  // Définir les en-têtes CORS explicitement
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-wallet-address');
  
  // Renvoyer des informations de diagnostic
  res.json({
    success: true,
    message: 'Route de diagnostic /api/discord/link fonctionnelle',
    serverTime: new Date().toISOString(),
    routes: {
      discordLink: '/api/discord/link',
      discordCallback: '/discord/callback',
      discordDebug: '/discord-debug',
      discordLinkDebug: '/api/discord/link-debug'
    }
  });
});

// Route directe pour /api/discord/link sans authentification
app.get('/api/discord/link', (req, res) => {
  // Définir les en-têtes CORS explicitement
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-wallet-address');
  
  // Extraire le token d'authentification
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(200).json({
      success: true,
      isLinked: false,
      message: 'Aucun token d\'authentification fourni, impossible de vérifier le statut de liaison Discord',
      debug: {
        authHeader: authHeader || 'Non fourni',
        token: 'Non fourni',
        serverTime: new Date().toISOString()
      }
    });
  }
  
  try {
    // Vérifier le token
    jwt.verify(token, process.env.JWT_SECRET || '33355ba6c0a14078bc8c17d3d05982e0e21619e1bebdeca51d039f06867d5f30d46ace3f01afd1d846a09d7d735a9589303b3e01baebd99d34672233f13967cb', async (err, user) => {
      if (err) {
        return res.status(200).json({
          success: true,
          isLinked: false,
          message: 'Token d\'authentification invalide',
          debug: {
            error: err.message,
            serverTime: new Date().toISOString()
          }
        });
      }
      
      // Récupérer l'adresse du wallet
      const walletAddress = user.address || user.walletAddress;
      
      if (!walletAddress) {
        return res.status(200).json({
          success: true,
          isLinked: false,
          message: 'Adresse de wallet non trouvée dans le token',
          debug: {
            user: user,
            serverTime: new Date().toISOString()
          }
        });
      }
      
      // Rechercher le lien Discord dans la base de données
      const discordLink = await DiscordLink.findOne({ walletAddress });
      
      if (!discordLink) {
        return res.status(200).json({
          success: true,
          isLinked: false,
          message: 'Aucun compte Discord lié à ce wallet',
          debug: {
            walletAddress: walletAddress,
            serverTime: new Date().toISOString()
          }
        });
      }
      
      // Renvoyer les informations du compte Discord lié
      return res.status(200).json({
        success: true,
        isLinked: true,
        discordUser: {
          id: discordLink.discordId,
          username: discordLink.discordUsername,
          avatar: discordLink.discordAvatar
        },
        notifyDailyClaims: discordLink.notifyDailyClaims || false,
        registrationOrder: discordLink.registrationOrder || null,
        debug: {
          walletAddress: walletAddress,
          serverTime: new Date().toISOString()
        }
      });
    });
  } catch (error) {
    console.error('Erreur lors de la vérification du lien Discord:', error);
    return res.status(500).json({
      success: false,
      isLinked: false,
      message: 'Erreur lors de la vérification du lien Discord',
      debug: {
        error: error.message,
        serverTime: new Date().toISOString()
      }
    });
  }
});

// Route de diagnostic pour les routes Discord
app.get('/api/discord-debug', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Discord debug route is accessible',
    routes: [
      { path: '/api/discord/auth', method: 'GET', auth: 'required' },
      { path: '/api/discord/callback', method: 'GET', auth: 'none' },
      { path: '/api/discord/link', method: 'GET', auth: 'required' }
    ]
  });
});

// Route directe pour le callback Discord (traitement complet)
app.get('/discord/callback', async (req, res) => {
  console.log('Reçu une requête sur /discord/callback');
  
  const { code, state } = req.query;
  
  if (!code || !state) {
    return res.status(400).json({
      success: false,
      message: 'Code ou état manquant dans la requête'
    });
  }
  
  try {
    // Décoder l'état pour récupérer l'adresse du wallet
    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
    const { walletAddress } = decodedState;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Adresse de wallet manquante dans l\'\u00e9tat'
      });
    }
    
    // Échanger le code contre un token d'accès Discord
    const DISCORD_API_ENDPOINT = 'https://discord.com/api/v10';
    const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
    const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
    const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
    
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
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error('Erreur lors de l\'\u00e9change du code:', tokenData);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'\u00e9change du code d\'autorisation'
      });
    }
    
    // Récupérer les informations de l'utilisateur Discord
    const userResponse = await fetch(`${DISCORD_API_ENDPOINT}/users/@me`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });
    
    const userData = await userResponse.json();
    
    if (!userData.id) {
      console.error('Erreur lors de la récupération des informations de l\'utilisateur:', userData);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des informations de l\'utilisateur Discord'
      });
    }
    
    // Enregistrer ou mettre à jour le lien Discord dans la base de données
    let discordLink = await DiscordLink.findOne({ walletAddress });
    let isNewLink = false;
    
    if (!discordLink) {
      // Créer un nouveau lien
      isNewLink = true;
      
      // Compter le nombre de liens existants pour déterminer l'ordre d'enregistrement
      const count = await DiscordLink.countDocuments();
      
      discordLink = new DiscordLink({
        walletAddress,
        discordId: userData.id,
        discordUsername: userData.username,
        discordAvatar: userData.avatar,
        notifyDailyClaims: true, // Activé par défaut
        registrationOrder: count + 1
      });
    } else {
      // Mettre à jour le lien existant
      discordLink.discordId = userData.id;
      discordLink.discordUsername = userData.username;
      discordLink.discordAvatar = userData.avatar;
    }
    
    await discordLink.save();
    
    // Construire l'URL de redirection vers le frontend
    const frontendUrl = process.env.FRONTEND_URL || 'https://wind-frontend-rosy.vercel.app';
    const redirectUrl = `${frontendUrl}?discordLinked=true`;
    
    // Définir les en-têtes CORS explicitement
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    // Rediriger vers le frontend
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Erreur lors du traitement du callback Discord:', error);
    
    // Rediriger vers le frontend avec un message d'erreur
    const frontendUrl = process.env.FRONTEND_URL || 'https://wind-frontend-rosy.vercel.app';
    res.redirect(`${frontendUrl}?discordLinked=false&error=${encodeURIComponent('Erreur lors de l\'authentification Discord')}`);
  }
});

// Route de santé (health check) pour vérifier que le serveur fonctionne
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Route de diagnostic Discord générale - accessible directement à la racine
app.get('/discord-debug', (req, res) => {
  // Définir les en-têtes CORS explicitement
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  res.json({
    success: true,
    message: 'API Discord fonctionnelle',
    serverTime: new Date().toISOString(),
    routes: {
      callback: '/discord/callback',
      link: '/api/discord/link',
      linkDebug: '/api/discord/link-debug'
    },
    environment: {
      discordRedirectUri: process.env.DISCORD_REDIRECT_URI,
      frontendUrl: process.env.FRONTEND_URL || 'https://lastexitfromnowhere.github.io/Wind_Frontend'
    }
  });
});

// Duplication de la route pour assurer la compatibilité
app.get('/api/discord-debug', (req, res) => {
  // Définir les en-têtes CORS explicitement
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  res.json({
    success: true,
    message: 'API Discord fonctionnelle',
    serverTime: new Date().toISOString(),
    routes: {
      callback: '/discord/callback',
      link: '/api/discord/link',
      linkDebug: '/api/discord/link-debug'
    },
    environment: {
      discordRedirectUri: process.env.DISCORD_REDIRECT_URI,
      frontendUrl: process.env.FRONTEND_URL || 'https://lastexitfromnowhere.github.io/Wind_Frontend'
    }
  });
});

// Route de statut (sans authentification)
app.get('/status', (req, res) => {
  // Définir les en-têtes CORS explicitement pour cette route
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'production'
  });
});

// Route de statut alternative (sans authentification)
app.get('/api/status', (req, res) => {
  // Définir les en-têtes CORS explicitement pour cette route
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'production'
  });
});

// Route de diagnostic pour le lien Discord (sans authentification)
app.get('/api/discord/link-debug', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  res.json({
    success: true,
    message: 'Route de diagnostic pour le lien Discord',
    isDebug: true
  });
});

// Route de secours directe pour le callback Discord
app.get('/api/discord/callback-direct', async (req, res) => {
  const { code, state } = req.query;
  
  if (!code || !state) {
    return res.status(400).json({
      success: false,
      message: 'Code ou état manquant dans la requête'
    });
  }
  
  // Construire l'URL de redirection vers le frontend
  const frontendUrl = process.env.FRONTEND_URL || 'https://lastexitfromnowhere.github.io/Wind_Frontend';
  const redirectUrl = `${frontendUrl}?discordLinked=true&code=${code}`;
  
  // Rediriger l'utilisateur vers le frontend
  console.log(`Redirection directe vers: ${redirectUrl}`);
  return res.redirect(redirectUrl);
});

// Route spécifique pour le lien Discord (fallback)
app.get('/api/discord/link', authenticateToken, async (req, res) => {
  try {
    const walletAddress = req.user.address || req.user.walletAddress;
    
    if (!walletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Vous devez être connecté avec un wallet pour accéder à cette ressource'
      });
    }
    
    // Importer le modèle DiscordLink
    const DiscordLink = mongoose.model('DiscordLink');
    
    const discordLink = await DiscordLink.findOne({ walletAddress });
    
    if (!discordLink) {
      return res.status(404).json({
        success: false,
        message: 'Aucun compte Discord lié à ce wallet',
        isLinked: false
      });
    }
    
    res.json({
      success: true,
      isLinked: true,
      discordUser: {
        id: discordLink.discordId,
        username: discordLink.discordUsername,
        avatar: discordLink.discordAvatar
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du lien Discord:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du lien Discord'
    });
  }
});

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('? MongoDB connecté'))
  .catch(err => console.error('? Erreur MongoDB :', err));

// Middleware pour vérifier l'authentification par wallet
const checkWalletAuth = (req, res, next) => {
  // Récupérer l'adresse du wallet depuis différentes sources
  let walletAddress = req.headers['x-wallet-address'] || req.body.walletAddress || req.body.clientWalletAddress;

  // Vérifier si l'authentification est fournie via l'en-tête Authorization Bearer
  const authHeader = req.headers['authorization'];
  if (!walletAddress && authHeader && authHeader.startsWith('Bearer ')) {
    walletAddress = authHeader.substring(7); // Enlever 'Bearer ' pour obtenir le token
  }

  if (!walletAddress) {
    return res.status(401).json({
      success: false,
      message: 'Adresse de wallet non fournie'
    });
  }

  // Stocker l'adresse du wallet pour l'utiliser dans les routes
  req.walletAddress = walletAddress;
  next();
};

// Route de base pour la santé de l'API
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Ajout d'un endpoint /api/connect qui redirige vers /connect
app.post('/api/connect', checkWalletAuth, async (req, res) => {
  try {
    console.log(`?? Redirection de /api/connect vers /connect pour ${req.walletAddress}`);

    // Logique pour connecter l'utilisateur au VPN
    const { nodeInfo, isHost } = req.body;

    // Vérifier si l'utilisateur a déjà une configuration
    let config = await WireGuardConfig.findOne({ walletAddress: req.walletAddress });

    if (!config) {
      // Créer une nouvelle configuration
      const keys = await wireguardUtils.generateKeyPair();
      const assignedIp = await wireguardUtils.getNextAvailableIp();

      config = new WireGuardConfig({
        walletAddress: req.walletAddress,
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
        assignedIp: assignedIp,
        isConnected: true,
        nodeId: 'node1',
        connectedSince: new Date(),
        bandwidth: { download: 0, upload: 0 },
        isHost: isHost || false,
        nodeInfo: nodeInfo || null
      });

      await config.save();
    } else {
      // Mettre à jour la configuration existante
      config.isConnected = true;
      config.connectedSince = new Date();
      config.isHost = isHost || config.isHost || false;
      if (nodeInfo) config.nodeInfo = nodeInfo;
      await config.save();
    }

    // Démarrer le nœud WireGuard si l'utilisateur est un hébergeur
    if (isHost) {
      console.log(`?? L'utilisateur est un hébergeur, démarrage du nœud WireGuard...`);

      // Exécuter la commande wg-quick up wg0
      try {
        const { stdout, stderr } = await new Promise((resolve, reject) => {
          exec('wg-quick up wg0', (error, stdout, stderr) => {
            if (error) {
              console.error(`? Erreur WireGuard: ${stderr}`);
              reject(error);
            } else {
              resolve({ stdout, stderr });
            }
          });
        });

        console.log(`? Nœud WireGuard démarré avec succès`);
        console.log(`?? Sortie: ${stdout}`);
      } catch (error) {
        console.error(`? Erreur lors du démarrage du nœud WireGuard: ${error.message}`);
        // On continue malgré l'erreur, car on veut quand même renvoyer une réponse
      }
    }

    console.log(`? Utilisateur connecté avec succès au VPN`);

    res.json({
      success: true,
      message: 'Connecté au VPN avec succès',
      ip: config.assignedIp,
      bandwidth: 100, // Valeur fictive pour l'instant
      nodeType: isHost ? 'HOST' : 'USER',
      status: 'ACTIVE'
    });
  } catch (error) {
    console.error(`? Erreur: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Impossible de se connecter au VPN'
    });
  }
});

// Intégration des routes VPN
app.use('/api', vpnRoutes);

// Intégration des routes de récompenses
app.use('/', rewardsRoutes);

app.get('/network-stats', checkWalletAuth, async (req, res) => {
  try {
    // Simuler des statistiques de réseau
    res.json({
      success: true,
      stats: {
        totalNodes: 1,
        activeNodes: 1,
        totalBandwidth: 100, // Mbps
        totalUsers: 10, // À remplacer par une requête réelle
        averageLatency: 20, // ms
        uptime: 99.9, // pourcentage
        earnings: {
          total: 0,
          daily: 0
        }
      }
    });
  } catch (error) {
    console.error(`? Erreur: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Impossible de récupérer les statistiques du réseau'
    });
  }
});

app.get('/available-nodes', checkWalletAuth, async (req, res) => {
  try {
    exec('wg show', (error, stdout, stderr) => {
      if (error) {
        console.error(`? Erreur WireGuard: ${stderr}`);
        return res.status(500).json({
          success: false,
          message: 'Impossible de récupérer la liste des nœuds VPN'
        });
      }
      res.json({
        success: true,
        nodes: [
          {
            id: 'node1',
            name: 'VPN Node 1',
            location: 'Paris, France',
            bandwidth: 100, // Mbps
            latency: 20, // ms
            status: 'ACTIVE',
            users: 5
          }
        ]
      });
    });
  } catch (error) {
    console.error(`? Erreur: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Impossible de récupérer la liste des nœuds VPN'
    });
  }
});

app.post('/connect', checkWalletAuth, async (req, res) => {
  try {
    // Logique pour connecter l'utilisateur au VPN
    const { nodeInfo, isHost } = req.body;

    // Vérifier si l'utilisateur a déjà une configuration
    let config = await WireGuardConfig.findOne({ walletAddress: req.walletAddress });

    if (!config) {
      // Créer une nouvelle configuration
      const keys = await wireguardUtils.generateKeyPair();
      const assignedIp = await wireguardUtils.getNextAvailableIp();

      config = new WireGuardConfig({
        walletAddress: req.walletAddress,
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
        assignedIp: assignedIp,
        isConnected: true,
        nodeId: 'node1',
        connectedSince: new Date(),
        bandwidth: { download: 0, upload: 0 },
        isHost: isHost || false,
        nodeInfo: nodeInfo || null
      });

      await config.save();
    } else {
      // Mettre à jour la configuration existante
      config.isConnected = true;
      config.connectedSince = new Date();
      config.isHost = isHost || config.isHost || false;
      if (nodeInfo) config.nodeInfo = nodeInfo;
      await config.save();
    }

    // Démarrer le nœud WireGuard si l'utilisateur est un hébergeur
    if (isHost) {
      console.log(`?? L'utilisateur est un hébergeur, démarrage du nœud WireGuard...`);

      // Exécuter la commande wg-quick up wg0
      try {
        const { stdout, stderr } = await new Promise((resolve, reject) => {
          exec('wg-quick up wg0', (error, stdout, stderr) => {
            if (error) {
              console.error(`? Erreur WireGuard: ${stderr}`);
              reject(error);
            } else {
              resolve({ stdout, stderr });
            }
          });
        });

        console.log(`? Nœud WireGuard démarré avec succès`);
        console.log(`?? Sortie: ${stdout}`);
      } catch (error) {
        console.error(`? Erreur lors du démarrage du nœud WireGuard: ${error.message}`);
        // On continue malgré l'erreur, car on veut quand même renvoyer une réponse
      }
    }

    console.log(`? Utilisateur connecté avec succès au VPN`);

    res.json({
      success: true,
      message: 'Connecté au VPN avec succès',
      ip: config.assignedIp,
      bandwidth: 100, // Valeur fictive pour l'instant
      nodeType: isHost ? 'HOST' : 'USER',
      status: 'ACTIVE'
    });
  } catch (error) {
    console.error(`? Erreur: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Impossible de se connecter au VPN'
    });
  }
});

app.post('/disconnect', checkWalletAuth, async (req, res) => {
  try {
    // Logique pour déconnecter l'utilisateur du VPN
    const config = await WireGuardConfig.findOne({ walletAddress: req.walletAddress });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration VPN non trouvée'
      });
    }

    // Mettre à jour la configuration
    config.isConnected = false;
    await config.save();

    console.log(`? Utilisateur déconnecté avec succès du VPN`);

    res.json({
      success: true,
      message: 'Déconnecté du VPN avec succès'
    });
  } catch (error) {
    console.error(`? Erreur: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Impossible de se déconnecter du VPN'
    });
  }
});

app.get('/status', checkWalletAuth, async (req, res) => {
  try {
    // Vérifier si l'utilisateur a une configuration
    const config = await WireGuardConfig.findOne({ walletAddress: req.walletAddress });

    if (!config) {
      return res.json({
        success: true,
        isConnected: false,
        message: 'Non connecté au VPN'
      });
    }

    res.json({
      success: true,
      isConnected: config.isConnected,
      ip: config.assignedIp,
      connectedSince: config.connectedSince,
      bandwidth: config.bandwidth,
      nodeType: config.isHost ? 'HOST' : 'USER',
      status: config.isConnected ? 'ACTIVE' : 'INACTIVE'
    });
  } catch (error) {
    console.error(`? Erreur: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Impossible de récupérer le statut VPN'
    });
  }
});

app.use('/dht', dhtRoutes);

app.listen(PORT, () => {
  console.log(`?? Serveur démarré sur le port ${PORT}`);
});

export default app;
