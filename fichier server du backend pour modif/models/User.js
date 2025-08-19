// models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  googleId: { 
    type: String, 
    unique: true,
    sparse: true 
  },
  email: { 
    type: String, 
    unique: true, 
    sparse: true 
  },
  displayName: String,
  firstName: String,
  lastName: String,
  profilePicture: String,
  password: {
    type: String,
    select: false
  },
  walletAddress: { 
    type: String, 
    sparse: true 
  },
  isAdmin: { 
    type: Boolean, 
    default: false 
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  lastLogin: Date,
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Index pour les recherches rapides
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
