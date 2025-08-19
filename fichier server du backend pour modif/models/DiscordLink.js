import mongoose from 'mongoose';

const DiscordLinkSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    index: true
  },
  discordId: {
    type: String,
    required: true,
    index: true
  },
  discordUsername: {
    type: String,
    required: true
  },
  discordAvatar: {
    type: String,
    default: null
  },
  // Champ pour suivre l'ordre d'inscription (pour attribuer des rôles spéciaux)
  registrationOrder: {
    type: Number,
    index: true
  },
  // Champs pour les notifications de daily claims
  notifyDailyClaims: {
    type: Boolean,
    default: true
  },
  lastNotified: {
    type: Date,
    default: null
  },
  // Rôles attribués
  roles: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Ajouter des index simples sans contrainte d'unicité
DiscordLinkSchema.index({ walletAddress: 1 });
DiscordLinkSchema.index({ discordId: 1 });

// Middleware pour mettre à jour la date de modification
DiscordLinkSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Créer le modèle s'il n'existe pas déjà
let DiscordLink;
try {
  DiscordLink = mongoose.model('DiscordLink');
} catch (error) {
  DiscordLink = mongoose.model('DiscordLink', DiscordLinkSchema);
}

export default DiscordLink;
