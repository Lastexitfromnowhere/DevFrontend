import mongoose from 'mongoose';

const DHTNodeSchema = new mongoose.Schema({
  nodeId: { type: String, required: true, unique: true },
  walletAddress: { type: String, required: true },
  publicKey: { type: String, required: true },
  ip: { type: String, required: true },
  port: { type: Number, required: true },
  multiaddr: { type: String, required: true },
  isActive: { type: Boolean, default: false },
  isHost: { type: Boolean, default: false },
  bandwidth: { type: Number, default: 0 }, // en Mbps
  latency: { type: Number, default: 0 }, // en ms
  uptime: { type: Number, default: 0 }, // en secondes
  lastSeen: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Index pour les recherches rapides
DHTNodeSchema.index({ nodeId: 1 });
DHTNodeSchema.index({ walletAddress: 1 });
DHTNodeSchema.index({ isActive: 1 });

const DHTNode = mongoose.model('DHTNode', DHTNodeSchema);

export default DHTNode;
