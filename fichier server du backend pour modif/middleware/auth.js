// middleware/auth.js
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
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-wallet-address');
  res.header('Access-Control-Expose-Headers', 'Access-Control-Allow-Origin');
};

export const authenticateToken = (req, res, next) => {
  // Définir les en-têtes CORS pour toutes les réponses d'authentification
  setCorsHeaders(req, res);
  
  // Gérer les requêtes OPTIONS préliminaires
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  // Récupérer le token d'authentification
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // Si aucun token n'est fourni
  if (!token) {
    // En mode développement, autoriser les requêtes sans token
    if (process.env.NODE_ENV === 'development') {
      console.log('Mode développement: Requête autorisée sans token');
      return next();
    }

    return res.status(401).json({
      success: false,
      message: 'Accès non autorisé: Token manquant'
    });
  }

  // Vérifier le token
  jwt.verify(token, process.env.JWT_SECRET || '33355ba6c0a14078bc8c17d3d05982e0e21619e1bebdeca51d039f06867d5f30d46ace3f01afd1d846a09d7d735a9589303b3e01baebd99d34672233f13967cb', (err, user) => {
    if (err) {
      // En mode développement, autoriser les requêtes même avec un token invalide
      if (process.env.NODE_ENV === 'development') {
        console.log('Mode développement: Requête autorisée malgré un token invalide');
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Accès interdit: Token invalide'
      });
    }

    // Ajouter l'utilisateur à l'objet de requête
    req.user = user;
    next();
  });
};
