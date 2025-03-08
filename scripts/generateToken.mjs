// scripts/generateToken.mjs
// Script pour générer un token JWT valide pour le service DHT
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Récupérer le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Essayer de charger le secret JWT depuis .env.local
let JWT_SECRET = 'votre_secret_jwt_super_securise';
try {
  const envPath = path.resolve(__dirname, '../.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const jwtSecretMatch = envContent.match(/JWT_SECRET=(.+)/);
  if (jwtSecretMatch && jwtSecretMatch[1]) {
    JWT_SECRET = jwtSecretMatch[1].trim();
    console.log('Secret JWT chargé depuis .env.local');
  }
} catch (error) {
  console.warn('Impossible de charger le secret JWT depuis .env.local, utilisation du secret par défaut');
}

// Récupérer l'adresse du wallet depuis les arguments ou utiliser une valeur par défaut
const walletAddress = process.argv[2] || '0xVotreAdresseWallet';

// Générer un token JWT
const generateToken = (walletAddress, expiresIn = '1h') => {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    walletAddress,
    role: 'user',
    iat: now
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

// Fonction pour encoder un token JWT simple (compatible avec l'implémentation frontend)
const encodeSimpleJWT = (payload) => {
  // Créer l'en-tête (header)
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  // Encoder l'en-tête et le payload en base64
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  // Créer la signature basée sur l'adresse du wallet (comme dans le frontend)
  const signature = Buffer.from(
    Array.from(payload.walletAddress)
      .map(char => char.charCodeAt(0))
      .reduce((acc, val) => acc + val, 0)
      .toString(16)
  ).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  // Assembler le token JWT
  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

// Générer les deux types de tokens
const now = Math.floor(Date.now() / 1000);
const expiresAt = now + 3600; // 1 heure

// Token JWT standard (pour le backend)
const jwtToken = generateToken(walletAddress);

// Token simplifié (compatible avec le frontend)
const payload = {
  walletAddress,
  role: 'user',
  iat: now,
  exp: expiresAt
};
const simpleToken = encodeSimpleJWT(payload);

// Afficher les tokens
console.log('\n1. Token JWT standard (pour le backend):');
console.log('----------------------------');
console.log(jwtToken);
console.log('----------------------------');

console.log('\n2. Token simplifié (compatible avec le frontend):');
console.log('----------------------------');
console.log(simpleToken);
console.log('----------------------------');

// Décoder le token pour vérification
const decoded = jwt.decode(jwtToken);
console.log('\nInformations du token:');
console.log('- Adresse wallet:', decoded.walletAddress);
console.log('- Rôle:', decoded.role);
console.log('- Émis le:', new Date(decoded.iat * 1000).toLocaleString());
console.log('- Expire le:', new Date(decoded.exp * 1000).toLocaleString());

// Afficher les commandes curl pour tester l'API DHT
console.log('\nCommandes curl pour tester l\'API DHT:');
console.log('----------------------------');
console.log(`curl -X GET "http://localhost:3000/dht/status" -H "Authorization: Bearer ${simpleToken}"`);
console.log(`curl -X GET "http://46.101.36.247:10001/dht/status" -H "Authorization: Bearer ${jwtToken}"`);
console.log('----------------------------');

// Exporter les tokens pour une utilisation dans d'autres scripts
export default {
  jwtToken,
  simpleToken
};
