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
  const payload = {
    walletAddress,
    role: 'user',
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

// Générer le token
const token = generateToken(walletAddress);

// Afficher le token
console.log('\nToken JWT généré avec succès:');
console.log('----------------------------');
console.log(token);
console.log('----------------------------');

// Décoder le token pour vérification
const decoded = jwt.decode(token);
console.log('\nInformations du token:');
console.log('- Adresse wallet:', decoded.walletAddress);
console.log('- Rôle:', decoded.role);
console.log('- Émis le:', new Date(decoded.iat * 1000).toLocaleString());
console.log('- Expire le:', new Date(decoded.exp * 1000).toLocaleString());

// Afficher les commandes curl pour tester l'API DHT
console.log('\nCommandes curl pour tester l\'API DHT:');
console.log('----------------------------');
console.log(`curl -X GET "http://localhost:3000/dht/status" -H "Authorization: Bearer ${token}"`);
console.log(`curl -X GET "http://46.101.36.247:10001/dht/status" -H "Authorization: Bearer ${token}"`);
console.log('----------------------------');

// Exporter le token pour une utilisation dans d'autres scripts
export default token;
