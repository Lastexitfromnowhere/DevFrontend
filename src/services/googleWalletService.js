// src/services/googleWalletService.js
// Service pour gérer les portefeuilles Solana générés pour les utilisateurs Google

import { Keypair } from '@solana/web3.js';
import * as nacl from 'tweetnacl';

// Clé pour stocker le portefeuille dans le localStorage
const GOOGLE_WALLET_KEY = 'google_wallet';

/**
 * Génère un portefeuille Solana déterministe basé sur l'ID Google
 * @param {string} googleId - L'identifiant unique de l'utilisateur Google
 * @returns {Object} - Le portefeuille généré avec publicKey et secretKey
 */
const generateDeterministicWallet = (googleId) => {
  try {
    // Créer une seed déterministe basée sur l'ID Google
    // Dans une implémentation réelle, cela devrait être fait côté serveur avec un sel secret
    const seed = new Uint8Array(32);
    const googleIdBytes = new TextEncoder().encode(googleId);
    
    // Remplir la seed avec les bytes de l'ID Google (de manière simplifiée)
    for (let i = 0; i < Math.min(googleIdBytes.length, 32); i++) {
      seed[i] = googleIdBytes[i];
    }
    
    // Générer un keypair Solana à partir de la seed
    const keypair = Keypair.fromSeed(seed);
    
    return {
      publicKey: keypair.publicKey.toString(),
      secretKey: Buffer.from(keypair.secretKey).toString('hex')
    };
  } catch (error) {
    console.error('Erreur lors de la génération du portefeuille:', error);
    return null;
  }
};

/**
 * Récupère ou génère un portefeuille pour un utilisateur Google
 * @param {string} googleId - L'identifiant unique de l'utilisateur Google
 * @returns {{ publicKey: string, secretKey: string }} - Le portefeuille avec publicKey et secretKey
 */
const getOrCreateGoogleWallet = (googleId) => {
  // Vérifier si un portefeuille existe déjà pour cet utilisateur
  const existingWallet = localStorage.getItem(`${GOOGLE_WALLET_KEY}_${googleId}`);
  
  if (existingWallet) {
    return JSON.parse(existingWallet);
  }
  
  // Générer un nouveau portefeuille
  const newWallet = generateDeterministicWallet(googleId);
  
  if (newWallet) {
    // Sauvegarder le portefeuille dans le localStorage
    localStorage.setItem(`${GOOGLE_WALLET_KEY}_${googleId}`, JSON.stringify(newWallet));
    return newWallet;
  }
  
  return null;
};

/**
 * Récupère l'adresse publique du portefeuille d'un utilisateur Google
 * @param {string} googleId - L'identifiant unique de l'utilisateur Google
 * @returns {string|null} - L'adresse publique du portefeuille ou null si non trouvé
 */
const getGoogleWalletAddress = (googleId) => {
  const wallet = getOrCreateGoogleWallet(googleId);
  return wallet ? wallet.publicKey : null;
};

/**
 * Vérifie si un utilisateur a un portefeuille Google
 * @param {string} googleId - L'identifiant unique de l'utilisateur Google
 * @returns {boolean} - True si l'utilisateur a un portefeuille, false sinon
 */
const hasGoogleWallet = (googleId) => {
  return localStorage.getItem(`${GOOGLE_WALLET_KEY}_${googleId}`) !== null;
};

/**
 * Supprime le portefeuille d'un utilisateur Google
 * @param {string} googleId - L'identifiant unique de l'utilisateur Google
 */
const removeGoogleWallet = (googleId) => {
  localStorage.removeItem(`${GOOGLE_WALLET_KEY}_${googleId}`);
};

// Exporter les fonctions du service
export const googleWalletService = {
  getOrCreateGoogleWallet,
  getGoogleWalletAddress,
  hasGoogleWallet,
  removeGoogleWallet
};
