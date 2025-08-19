// Ce script est conçu pour être exécuté directement dans la console MongoDB
// pour résoudre le problème de clé dupliquée

// 1. Supprimer tous les liens Discord avec l'ID problématique sauf le plus récent
db.discordlinks.find({ discordId: "1358002400249647216" }).sort({ updatedAt: -1 }).skip(1).forEach(function(doc) {
  print("Suppression du document avec _id: " + doc._id);
  db.discordlinks.deleteOne({ _id: doc._id });
});

// 2. Vérifier qu'il ne reste qu'un seul document avec cet ID
var count = db.discordlinks.count({ discordId: "1358002400249647216" });
print("Nombre de documents restants avec discordId 1358002400249647216: " + count);

// 3. Supprimer et recréer les index
print("Suppression des index existants...");
db.discordlinks.dropIndexes();

// 4. Recréer les index avec sparse: true
print("Création de nouveaux index...");
db.discordlinks.createIndex({ walletAddress: 1 }, { unique: true, sparse: true });
db.discordlinks.createIndex({ discordId: 1 }, { unique: true, sparse: true });
print("Nouveaux index créés avec succès");
