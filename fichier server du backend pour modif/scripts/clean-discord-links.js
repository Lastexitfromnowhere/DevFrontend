const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Configuration du chemin
const __dirname = path.resolve();

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Connexion à MongoDB
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
console.log(`Connexion à MongoDB: ${MONGO_URI}`);

// Schéma DiscordLink (version simplifiée pour la migration)
const DiscordLinkSchema = new mongoose.Schema({
  walletAddress: String,
  discordId: String,
  discordUsername: String,
  discordAvatar: String,
  registrationOrder: Number,
  notifyDailyClaims: Boolean,
  lastNotified: Date,
  roles: [String],
  createdAt: Date,
  updatedAt: Date
});

// Modèle DiscordLink
const DiscordLink = mongoose.model('DiscordLink', DiscordLinkSchema, 'discordlinks');

async function cleanupDiscordLinks() {
  try {
    console.log('Démarrage du nettoyage des liens Discord...');
    
    // Se connecter à MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('Connecté à MongoDB');
    
    // 1. Trouver tous les discordId uniques
    const uniqueDiscordIds = await DiscordLink.distinct('discordId');
    console.log(`Nombre total de discordId uniques: ${uniqueDiscordIds.length}`);
    
    // 2. Pour chaque discordId, garder seulement l'entrée la plus récente
    let deletedCount = 0;
    
    for (const discordId of uniqueDiscordIds) {
      // Trouver toutes les entrées pour ce discordId
      const links = await DiscordLink.find({ discordId }).sort({ updatedAt: -1 });
      
      if (links.length > 1) {
        console.log(`Trouvé ${links.length} liens pour discordId: ${discordId}`);
        
        // Garder le premier (le plus récent) et supprimer les autres
        const [keep, ...duplicates] = links;
        
        if (duplicates.length > 0) {
          const duplicateIds = duplicates.map(d => d._id);
          const result = await DiscordLink.deleteMany({ _id: { $in: duplicateIds } });
          deletedCount += result.deletedCount;
          console.log(`Supprimé ${result.deletedCount} liens dupliqués pour discordId: ${discordId}`);
        }
      }
    }
    
    // 3. Trouver tous les walletAddress uniques
    const uniqueWallets = await DiscordLink.distinct('walletAddress');
    console.log(`Nombre total de walletAddress uniques: ${uniqueWallets.length}`);
    
    // 4. Pour chaque walletAddress, garder seulement l'entrée la plus récente
    for (const walletAddress of uniqueWallets) {
      // Trouver toutes les entrées pour ce walletAddress
      const links = await DiscordLink.find({ walletAddress }).sort({ updatedAt: -1 });
      
      if (links.length > 1) {
        console.log(`Trouvé ${links.length} liens pour walletAddress: ${walletAddress}`);
        
        // Garder le premier (le plus récent) et supprimer les autres
        const [keep, ...duplicates] = links;
        
        if (duplicates.length > 0) {
          const duplicateIds = duplicates.map(d => d._id);
          const result = await DiscordLink.deleteMany({ _id: { $in: duplicateIds } });
          deletedCount += result.deletedCount;
          console.log(`Supprimé ${result.deletedCount} liens dupliqués pour walletAddress: ${walletAddress}`);
        }
      }
    }
    
    // 5. Supprimer spécifiquement les entrées problématiques
    const problematicId = '1358002400249647216';
    const problematicLinks = await DiscordLink.find({ discordId: problematicId });
    
    if (problematicLinks.length > 1) {
      console.log(`Trouvé ${problematicLinks.length} liens pour le discordId problématique: ${problematicId}`);
      
      // Garder seulement le plus récent
      const [keep, ...duplicates] = problematicLinks.sort((a, b) => 
        new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
      );
      
      if (duplicates.length > 0) {
        const duplicateIds = duplicates.map(d => d._id);
        const result = await DiscordLink.deleteMany({ _id: { $in: duplicateIds } });
        deletedCount += result.deletedCount;
        console.log(`Supprimé ${result.deletedCount} liens dupliqués pour le discordId problématique: ${problematicId}`);
      }
    }
    
    console.log(`Nettoyage terminé. Total de ${deletedCount} liens dupliqués supprimés.`);
    
    // 6. Supprimer les index existants et les recréer
    console.log('Suppression des index existants...');
    await DiscordLink.collection.dropIndexes();
    console.log('Index supprimés avec succès');
    
    // 7. Recréer les index avec sparse: true
    console.log('Création de nouveaux index...');
    await DiscordLink.collection.createIndex({ walletAddress: 1 }, { unique: true, sparse: true });
    await DiscordLink.collection.createIndex({ discordId: 1 }, { unique: true, sparse: true });
    console.log('Nouveaux index créés avec succès');
    
  } catch (error) {
    console.error('Erreur lors du nettoyage des liens Discord:', error);
  } finally {
    // Fermer la connexion MongoDB
    await mongoose.connection.close();
    console.log('Connexion MongoDB fermée');
  }
}

// Exécuter le script
cleanupDiscordLinks().then(() => {
  console.log('Script terminé');
  process.exit(0);
}).catch(error => {
  console.error('Erreur lors de l\'exécution du script:', error);
  process.exit(1);
});

module.exports = { cleanupDiscordLinks };
