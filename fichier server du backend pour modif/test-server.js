import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import DiscordLink from './models/DiscordLink.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10001;

// Configuration CORS
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-wallet-address'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Route de test simple
app.get('/test', (req, res) => {
  res.json({ status: 'ok', message: 'Test server is running' });
});

// Route de test pour le modèle DiscordLink
app.get('/test/discord-link', async (req, res) => {
  try {
    const count = await DiscordLink.countDocuments();
    res.json({ 
      status: 'ok', 
      message: 'DiscordLink model is accessible',
      count
    });
  } catch (error) {
    console.error('Error accessing DiscordLink model:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Error accessing DiscordLink model',
      error: error.message
    });
  }
});

// Route de test pour la route Discord /link
app.get('/api/discord/link-test', async (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Discord link test route is accessible'
  });
});

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
  
  // Démarrer le serveur
  app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });
})
.catch(err => {
  console.error('MongoDB connection error:', err);
});
