// models/DesktopSession.js
import mongoose from 'mongoose';

const desktopSessionSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  walletAddress: {
    type: String,
    default: null
  },
  token: {
    type: String,
    default: null
  },
  authenticated: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600 // Expire après 1 heure si non utilisé
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Mettre à jour le champ lastUpdated avant chaque sauvegarde
desktopSessionSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

const DesktopSession = mongoose.model('DesktopSession', desktopSessionSchema);

export default DesktopSession;
