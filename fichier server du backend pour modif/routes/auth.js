// routes/auth.js
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/User.js'; // Vous devrez créer ce modèle
import DesktopSession from '../models/DesktopSession.js'; // Importer le nouveau modèle
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Liste des domaines autorisés
const allowedOrigins = [
  'https://wind-frontend-rosy.vercel.app',
  'https://www.lastparadox.xyz',
  'https://lastparadox.xyz',
  'http://localhost:3000',
  'http://localhost:5173'
];

// Fonction pour définir les en-têtes CORS appropriés
const setCorsHeaders = (req, res) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-wallet-address');
  res.header('Access-Control-Expose-Headers', 'Access-Control-Allow-Origin');
};

// Middleware pour gérer les requêtes OPTIONS préliminaires
router.use((req, res, next) => {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Route pour l'enregistrement d'un nouvel utilisateur
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    // Vérifier si les champs requis sont présents
    if (!username || !password || !email) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis (username, password, email)'
      });
    }
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Nom d\'utilisateur ou email déjà utilisé'
      });
    }
    
    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Créer un nouvel utilisateur
    const user = new User({
      username,
      password: hashedPassword,
      email
    });
    
    await user.save();
    
    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement'
    });
  }
});

// Route pour la connexion
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Vérifier si les champs requis sont présents
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nom d\'utilisateur et mot de passe requis'
      });
    }
    
    // Trouver l'utilisateur
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Nom d\'utilisateur ou mot de passe incorrect'
      });
    }
    
    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Nom d\'utilisateur ou mot de passe incorrect'
      });
    }
    
    // Générer un token JWT
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 3600; // 1 heure
    
    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        role: user.role || 'user',
        iat: now,
        exp: expiresAt
      },
      process.env.JWT_SECRET || '33355ba6c0a14078bc8c17d3d05982e0e21619e1bebdeca51d039f06867d5f30d46ace3f01afd1d846a09d7d735a9589303b3e01baebd99d34672233f13967cb',
      { algorithm: 'HS256' }
    );
    
    res.json({
      success: true,
      token,
      expiresAt,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role || 'user'
      }
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion'
    });
  }
});

// Route OPTIONS spécifique pour gérer les requêtes préliminaires CORS pour /token
router.options('/token', (req, res) => {
  const origin = req.headers.origin;
  console.log(`Requête OPTIONS /auth/token reçue - Origine: ${origin}`);
  
  // Vérifier si l'origine est autorisée et définir l'en-tête en conséquence
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    console.log(`En-tête CORS OPTIONS défini pour l'origine: ${origin}`);
  } else {
    console.log(`Origine OPTIONS non autorisée: ${origin}`);
  }
  
  // Définir les autres en-têtes CORS pour la requête préliminaire
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-wallet-address');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 heures
  
  // Répondre avec un statut 200 pour la requête préliminaire
  return res.sendStatus(200);
});

// Route existante pour générer un token JWT à partir d'une adresse de wallet
router.post('/token', (req, res) => {
  // Définir explicitement les en-têtes CORS pour cette route sensible
  const origin = req.headers.origin;
  console.log(`Requête /auth/token reçue - Origine: ${origin}`);
  
  // Vérifier si l'origine est autorisée et définir l'en-tête en conséquence
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    console.log(`En-tête CORS défini pour l'origine: ${origin}`);
  } else {
    console.log(`Origine non autorisée: ${origin}`);
  }
  
  // Définir les autres en-têtes CORS
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-wallet-address');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  const { walletAddress } = req.body;
  
  console.log(`Requête /auth/token reçue avec walletAddress: ${walletAddress}`);

  if (!walletAddress) {
    return res.status(400).json({
      success: false,
      message: 'Adresse de wallet requise'
    });
  }

  // Générer un token JWT
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 3600; // 1 heure

  const token = jwt.sign(
    {
      walletAddress,
      role: 'user',
      iat: now,
      exp: expiresAt
    },
    process.env.JWT_SECRET || '33355ba6c0a14078bc8c17d3d05982e0e21619e1bebdeca51d039f06867d5f30d46ace3f01afd1d846a09d7d735a9589303b3e01baebd99d34672233f13967cb',
    { algorithm: 'HS256' }
  );

  console.log(`Token généré avec succès pour ${walletAddress}`);
  console.log(`En-têtes de réponse: ${JSON.stringify(res.getHeaders())}`);
  
  res.json({
    success: true,
    token,
    expiresAt
  });
});

// Route protégée qui nécessite un token valide
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// NOUVELLES ROUTES POUR L'AUTHENTIFICATION DESKTOP

// Route pour initialiser une session desktop
router.post('/init-desktop-session', async (req, res) => {
  try {
    const { deviceId } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'ID de l\'appareil requis'
      });
    }
    
    // Vérifier si une session existe déjà pour cet appareil
    let session = await DesktopSession.findOne({ deviceId });
    
    if (session) {
      // Réinitialiser la session si elle existe déjà
      session.authenticated = false;
      session.walletAddress = null;
      session.token = null;
      session.lastUpdated = new Date();
    } else {
      // Créer une nouvelle session
      session = new DesktopSession({
        deviceId,
        authenticated: false
      });
    }
    
    await session.save();
    
    res.status(201).json({
      success: true,
      message: 'Session desktop initialisée',
      deviceId
    });
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la session desktop:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Route pour vérifier l'état d'une session desktop
router.get('/check-desktop-auth', async (req, res) => {
  try {
    const { deviceId } = req.query;
    
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'ID de l\'appareil requis'
      });
    }
    
    // Trouver la session
    const session = await DesktopSession.findOne({ deviceId });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session non trouvée'
      });
    }
    
    // Renvoyer l'état de la session
    res.json({
      success: true,
      authenticated: session.authenticated,
      walletAddress: session.authenticated ? session.walletAddress : null,
      token: session.authenticated ? session.token : null
    });
  } catch (error) {
    console.error('Erreur lors de la vérification de la session desktop:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Route pour authentifier une session desktop avec Solana
router.post('/authenticate-desktop', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.body;
    const { walletAddress } = req.user;
    
    if (!deviceId || !walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'ID de l\'appareil et adresse de wallet requis'
      });
    }
    
    // Trouver la session
    let session = await DesktopSession.findOne({ deviceId });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session non trouvée'
      });
    }
    
    // Générer un token pour l'application desktop
    const token = jwt.sign(
      { walletAddress, deviceId },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    // Mettre à jour la session
    session.authenticated = true;
    session.walletAddress = walletAddress;
    session.token = token;
    session.lastUpdated = new Date();
    
    await session.save();
    
    res.json({
      success: true,
      message: 'Session desktop authentifiée avec succès',
      token
    });
  } catch (error) {
    console.error('Erreur lors de l\'authentification de la session desktop:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Route pour authentifier une session desktop directement avec l'adresse du portefeuille
// Cette route est utilisée par le frontend web après le scan du QR code
router.post('/authenticate-desktop-session', async (req, res) => {
  try {
    const { deviceId, walletAddress } = req.body;
    
    if (!deviceId || !walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'ID de l\'appareil et adresse de wallet requis'
      });
    }
    
    // Trouver la session
    let session = await DesktopSession.findOne({ deviceId });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session non trouvée'
      });
    }
    
    // Générer un token pour l'application desktop
    const token = jwt.sign(
      { walletAddress, deviceId },
      process.env.JWT_SECRET || '33355ba6c0a14078bc8c17d3d05982e0e21619e1bebdeca51d039f06867d5f30d46ace3f01afd1d846a09d7d735a9589303b3e01baebd99d34672233f13967cb',
      { expiresIn: '30d' }
    );
    
    // Mettre à jour la session
    session.authenticated = true;
    session.walletAddress = walletAddress;
    session.token = token;
    session.lastUpdated = new Date();
    
    await session.save();
    
    res.json({
      success: true,
      message: 'Session desktop authentifiée avec succès',
      token
    });
  } catch (error) {
    console.error('Erreur lors de l\'authentification de la session desktop:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Route pour créer une session QR
router.post('/qr/create', async (req, res) => {
  try {
    const { deviceId, deviceType } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'ID de l\'appareil requis'
      });
    }
    
    // Vérifier si une session existe déjà pour cet appareil
    let session = await DesktopSession.findOne({ deviceId });
    
    if (session) {
      // Réinitialiser la session si elle existe déjà
      session.authenticated = false;
      session.walletAddress = null;
      session.token = null;
      session.lastUpdated = new Date();
    } else {
      // Créer une nouvelle session
      session = new DesktopSession({
        deviceId,
        deviceType: deviceType || 'desktop',
        authenticated: false
      });
    }
    
    await session.save();
    
    res.status(201).json({
      success: true,
      message: 'Session QR créée',
      sessionId: deviceId
    });
  } catch (error) {
    console.error('Erreur lors de la création de la session QR:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Route pour vérifier le statut d'une session QR
router.get('/qr/status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'ID de session requis'
      });
    }
    
    // Trouver la session (le sessionId est en fait le deviceId)
    const session = await DesktopSession.findOne({ deviceId: sessionId });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session non trouvée'
      });
    }
    
    // Renvoyer l'état de la session
    res.json({
      success: true,
      authenticated: session.authenticated,
      token: session.authenticated ? session.token : null
    });
  } catch (error) {
    console.error('Erreur lors de la vérification du statut de la session QR:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

export default router;
