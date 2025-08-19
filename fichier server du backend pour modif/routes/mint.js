import express from 'express';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Metaplex, bundlrStorage, keypairIdentity } from '@metaplex-foundation/js';
import base58 from 'bs58';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const router = express.Router();

// --- Connexion à Solana mainnet-beta ---
const connection = new Connection('https://api.devnet.solana.com');
const mintAuthority = Keypair.fromSecretKey(base58.decode(process.env.MINT_AUTHORITY));
const metaplex = Metaplex.make(connection)
  .use(keypairIdentity(mintAuthority))
  .use(bundlrStorage());

// --- Config Discord ---
const discordBotURL = 'https://lastexitvpn.duckdns.org/discord/assign-role';
const PRIVATE_ROLE_ID = '1370069662309552148';

// --- Utilitaire pour récupérer l'ID Discord lié à un wallet ---
async function getDiscordIdForWallet(walletAddress) {
  try {
    const response = await fetch(`https://lastexitvpn.duckdns.org/discord/link?wallet=${walletAddress}`);
    const data = await response.json();
    return data?.discordUser?.id || null;
  } catch (err) {
    console.error('[DISCORD LINK ERROR]', err);
    return null;
  }
}

// Route temporairement désactivée pour l'intégration Truffle.wtf
router.post('/create', (req, res) => {
  res.json({ message: 'Route temporairement désactivée' });
});

router.post('/confirm', (req, res) => {
  res.json({ message: 'Route temporairement désactivée' });
});

export default router;
