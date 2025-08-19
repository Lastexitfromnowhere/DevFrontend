// models/WireGuardConfig.js
import mongoose from 'mongoose';

const wireGuardConfigSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  publicKey: {
    type: String,
    required: true
  },
  privateKey: {
    type: String,
    required: true
  },
  ip: {
    type: String,
    required: true
  },
  port: {
    type: Number,
    default: 51820
  },
  serverPublicKey: {
    type: String,
    required: true
  },
  serverIp: {
    type: String,
    required: true
  },
  serverPort: {
    type: Number,
    default: 51820
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const WireGuardConfig = mongoose.model('WireGuardConfig', wireGuardConfigSchema);

export default WireGuardConfig;