const jwt = require('jsonwebtoken');
const fs = require('fs');

// Récupérer la clé secrète depuis votre fichier .env ou config
require('dotenv').config();
const secret = process.env.JWT_SECRET;

// Créer un token valide (ajustez les données selon votre implémentation)
const token = jwt.sign({ 
  walletAddress: '0xVotreAdresseWallet',
  role: 'user'
}, secret, { expiresIn: '1h' });

console.log(token);
