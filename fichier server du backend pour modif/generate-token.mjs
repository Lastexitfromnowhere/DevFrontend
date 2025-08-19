import jwt from 'jsonwebtoken';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Configurer dotenv
dotenv.config();

// Récupérer la clé secrète
const secret = process.env.JWT_SECRET;

if (!secret) {
  console.error("Erreur: JWT_SECRET n'est pas défini dans les variables d'environnement");
  process.exit(1);
}

// Créer un token valide
const token = jwt.sign({ 
  walletAddress: '0xVotreAdresseWallet',
  role: 'user'
}, secret, { expiresIn: '1h' });

console.log(token);
