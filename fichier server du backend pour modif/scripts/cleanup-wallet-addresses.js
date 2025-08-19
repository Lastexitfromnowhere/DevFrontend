import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// Charger les variables d'environnement depuis le .env à la racine
dotenv.config({ path: '../.env' });

// Configuration de la connexion MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vpn-db';

// Modèle DailyClaim
const DailyClaimSchema = new mongoose.Schema({
  walletAddress: String,
  claimHistory: [{
    amount: Number,
    timestamp: Date,
    status: String
  }],
  lastClaimDate: Date,
  __v: Number
});

const DailyClaim = mongoose.model('DailyClaim', DailyClaimSchema, 'dailyclaims');

// Fonction pour valider une adresse Solana (validation basique)
function isValidSolanaAddress(address) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

// Fonction pour extraire l'adresse d'un JWT
function extractWalletFromJwt(token) {
  try {
    if (!token || typeof token !== 'string') {
      console.log('Token invalide ou manquant');
      return null;
    }
    
    // Essayer de décoder le JWT sans vérifier la signature
    const decoded = jwt.decode(token, { complete: true });
    
    // Afficher des informations de débogage
    console.log('Token décodé:', JSON.stringify(decoded, null, 2));
    
    if (!decoded) {
      console.log('Impossible de décoder le JWT');
      return null;
    }
    
    // Vérifier si le payload contient walletAddress
    const walletAddress = decoded.payload?.walletAddress || decoded.payload?.sub;
    
    if (!walletAddress) {
      console.log('Aucune adresse trouvée dans le JWT');
      return null;
    }
    
    console.log('Adresse extraite du JWT:', walletAddress);
    
    // Vérifier que l'adresse extraite est valide
    if (isValidSolanaAddress(walletAddress)) {
      return walletAddress;
    } else {
      console.log('Adresse extraite non valide:', walletAddress);
      return null;
    }
  } catch (error) {
    console.error('Erreur lors du décodage du JWT:', error.message);
    console.error('Stack:', error.stack);
    return null;
  }
}

// Fonction principale de nettoyage
async function cleanWalletAddresses() {
  try {
    // Se connecter à MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connecté à MongoDB');

    // Trouver tous les documents
    const claims = await DailyClaim.find({});
    console.log(`Nombre total d'entrées: ${claims.length}`);

    let updatedCount = 0;
    let invalidCount = 0;
    let alreadyValidCount = 0;

    for (const claim of claims) {
      const originalAddress = claim.walletAddress;
      
      // Vérifier si l'adresse est déjà valide
      if (isValidSolanaAddress(originalAddress)) {
        alreadyValidCount++;
        continue;
      }

      // Essayer d'extraire une adresse valide du JWT
      const extractedAddress = extractWalletFromJwt(originalAddress);
      
      if (extractedAddress) {
        // Mode test - Affiche ce qui serait modifié sans rien changer
        console.log(`[TEST] Mise à jour: ${originalAddress.substring(0, 30)}... -> ${extractedAddress}`);
        return;  // Supprimez cette ligne pour appliquer les modifications
        
        // Mettre à jour avec l'adresse extraite (décommentez pour activer)
        // claim.walletAddress = extractedAddress;
        // await claim.save();
        // console.log(`Mise à jour appliquée: ${originalAddress.substring(0, 30)}... -> ${extractedAddress}`);
        // updatedCount++;
        //fin du mode test
      } else {
        console.log(`Adresse invalide et impossible d'extraire une adresse valide: ${originalAddress.substring(0, 50)}...`);
        invalidCount++;
      }
    }

    console.log('\nRésumé du nettoyage:');
    console.log(`- Entrées déjà valides: ${alreadyValidCount}`);
    console.log(`- Entrées mises à jour: ${updatedCount}`);
    console.log(`- Entrées invalides: ${invalidCount}`);

  } catch (error) {
    console.error('Erreur lors du nettoyage:', error);
  } finally {
    // Fermer la connexion
    await mongoose.connection.close();
    console.log('Déconnecté de MongoDB');
  }
}

// Démarrer le nettoyage
cleanWalletAddresses();
