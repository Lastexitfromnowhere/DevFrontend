// Script MongoDB pour supprimer directement l'entrée problématique
// Exécuter avec: mongo < delete-discord-id.js

// Sélectionner la base de données
db = db.getSiblingDB('test');

// Afficher les documents existants avec cet ID
print("Documents avec l'ID problématique:");
db.discordlinks.find({ discordId: "1358002400249647216" }).forEach(printjson);

// Supprimer TOUS les documents avec cet ID
var result = db.discordlinks.deleteMany({ discordId: "1358002400249647216" });
print("Documents supprimés: " + result.deletedCount);

// Vérifier qu'il n'y a plus de documents avec cet ID
var remaining = db.discordlinks.find({ discordId: "1358002400249647216" }).count();
print("Documents restants avec cet ID: " + remaining);

// Supprimer et recréer les index
print("Suppression des index...");
db.discordlinks.dropIndexes();
print("Index supprimés");

// Recréer les index sans l'option unique
print("Création de nouveaux index sans contrainte unique...");
db.discordlinks.createIndex({ walletAddress: 1 });
db.discordlinks.createIndex({ discordId: 1 });
print("Nouveaux index créés");

// Afficher tous les index actuels
print("Index actuels:");
db.discordlinks.getIndexes().forEach(printjson);
