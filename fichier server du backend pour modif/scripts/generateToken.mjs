// scripts/generateToken.mjs
import jwt from 'jsonwebtoken';

// Configuration
const JWT_SECRET = 'votre_secret_jwt_super_securise'; // À remplacer par votre secret réel
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

// Générer le token
const token = generateToken(walletAddress);

// Afficher le token
console.log('\nToken JWT généré pour', walletAddress, ':');
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
console.log(`curl -X GET "http://46.101.36.247:10001/dht/status" -H "Authorization: Bearer ${token}"`);
console.log('----------------------------');
