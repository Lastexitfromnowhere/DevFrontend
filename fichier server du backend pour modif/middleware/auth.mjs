// middleware/auth.mjs
import jwt from 'jsonwebtoken';

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
  console.log(`[CORS] Requête reçue de l'origine: ${origin}`);
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    console.log(`[CORS] En-tête Access-Control-Allow-Origin défini à: ${origin}`);
  } else {
    console.log(`[CORS] Origine non autorisée: ${origin}`);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-wallet-address');
  res.header('Access-Control-Expose-Headers', 'Access-Control-Allow-Origin');
};

export const authenticateToken = (req, res, next) => {
  // Définir les en-têtes CORS pour toutes les réponses
  setCorsHeaders(req, res);
  
  // Gérer les requêtes OPTIONS préliminaires
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  try {
    // Récupérer le token d'authentification
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Si pas de token, vérifier si on est en mode développement
    if (!token) {
      if (process.env.NODE_ENV === 'development') {
        console.log('?? Aucun token fourni, mais on continue en mode développement');
        req.user = { walletAddress: '0x1234567890abcdef1234567890abcdef12345678' }; // Adresse de wallet fictive
        return next();
      } else {
        return res.status(401).json({ success: false, message: 'Token non fourni' });
      }
    }

    // Si le token est 'null' ou 'dummy-token-for-dev', vérifier si on est en mode développement
    if (token === 'null' || token === 'dummy-token-for-dev') {
      if (process.env.NODE_ENV === 'development') {
        console.log('?? Token de développement fourni, mais on continue en mode développement');
        req.user = { walletAddress: '0x1234567890abcdef1234567890abcdef12345678' }; // Adresse de wallet fictive
        return next();
      } else {
        return res.status(401).json({ success: false, message: 'Token invalide' });
      }
    }

    // Vérifier le token JWT
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        if (process.env.NODE_ENV === 'development') {
          console.log('?? Token invalide, mais on continue en mode développement');
          req.user = { walletAddress: '0x1234567890abcdef1234567890abcdef12345678' }; // Adresse de wallet fictive
          return next();
        } else {
          return res.status(403).json({ success: false, message: 'Token invalide' });
        }
      }

      // Si le token est valide, stocker les informations de l'utilisateur
      req.user = { walletAddress: user.walletAddress };
      next();
    });
  } catch (error) {
    console.error('? Erreur d\'authentification:', error);
    return res.status(401).json({ success: false, message: 'Token invalide' });
  }
};