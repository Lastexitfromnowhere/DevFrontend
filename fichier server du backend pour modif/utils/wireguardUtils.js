// utils/wireguardUtils.js
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import WireGuardConfig from '../models/WireGuardConfig.js';

const execAsync = promisify(exec);

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin vers le répertoire des configurations WireGuard
const WG_CONFIG_DIR = process.env.WG_CONFIG_DIR || path.join(__dirname, '..', 'wireguard-configs');

// Adresse IP du serveur VPN
const SERVER_IP = process.env.SERVER_IP || '46.101.36.247';
const SERVER_PORT = process.env.WG_PORT || 51820;
const SERVER_PUBLIC_KEY = process.env.WG_PUBLIC_KEY || 'votre-clé-publique-wireguard';

// Plage d'adresses IP pour les clients
const CLIENT_IP_RANGE = '10.8.0.';
let lastClientIpIndex = 2; // Commencer à .2 car .1 est généralement réservé pour le serveur

// Fonction pour générer une paire de clés WireGuard
export const generateWireGuardKeyPair = async () => {
  try {
    if (process.env.NODE_ENV === 'development' && process.env.SIMULATE_WG === 'true') {
      // En mode développement, simuler la génération de clés
      console.log('Simulation de la génération de clés WireGuard en mode développement');
      const privateKey = crypto.randomBytes(32).toString('base64');
      const publicKey = crypto.randomBytes(32).toString('base64');
      return { privateKey, publicKey };
    }

    // Générer la clé privée
    const { stdout: privateKey } = await execAsync('wg genkey');
    
    // Générer la clé publique à partir de la clé privée
    const { stdout: publicKey } = await execAsync(`echo "${privateKey.trim()}" | wg pubkey`);
    
    return {
      privateKey: privateKey.trim(),
      publicKey: publicKey.trim()
    };
  } catch (error) {
    console.error('Erreur lors de la génération des clés WireGuard:', error);
    
    // En cas d'erreur, générer des clés simulées
    const privateKey = crypto.randomBytes(32).toString('base64');
    const publicKey = crypto.randomBytes(32).toString('base64');
    
    return { privateKey, publicKey };
  }
};

// Fonction pour créer une configuration WireGuard pour un client
export const createWireGuardConfig = async (walletAddress) => {
  try {
    // Vérifier si une configuration existe déjà pour cette adresse de wallet
    let config = await WireGuardConfig.findOne({ walletAddress });
    
    if (config) {
      console.log(`Configuration WireGuard existante trouvée pour ${walletAddress}`);
      return {
        success: true,
        message: 'Configuration WireGuard existante récupérée',
        config: {
          walletAddress: config.walletAddress,
          publicKey: config.publicKey,
          privateKey: config.privateKey,
          ip: config.ip,
          port: config.port,
          serverPublicKey: config.serverPublicKey,
          serverIp: config.serverIp,
          serverPort: config.serverPort,
          createdAt: config.createdAt
        }
      };
    }
    
    // Générer une nouvelle paire de clés
    const { privateKey, publicKey } = await generateWireGuardKeyPair();
    
    // Attribuer une adresse IP au client
    const clientIp = CLIENT_IP_RANGE + (lastClientIpIndex++);
    
    // Créer la configuration
    config = new WireGuardConfig({
      walletAddress,
      publicKey,
      privateKey,
      ip: clientIp,
      port: 51820,
      serverPublicKey: SERVER_PUBLIC_KEY,
      serverIp: SERVER_IP,
      serverPort: SERVER_PORT
    });
    
    // Sauvegarder la configuration dans la base de données
    await config.save();
    
    console.log(`Nouvelle configuration WireGuard créée pour ${walletAddress}`);
    
    // Créer le fichier de configuration client
    await createClientConfigFile(config);
    
    return {
      success: true,
      message: 'Configuration WireGuard créée avec succès',
      config: {
        walletAddress: config.walletAddress,
        publicKey: config.publicKey,
        privateKey: config.privateKey,
        ip: config.ip,
        port: config.port,
        serverPublicKey: config.serverPublicKey,
        serverIp: config.serverIp,
        serverPort: config.serverPort,
        createdAt: config.createdAt
      }
    };
  } catch (error) {
    console.error('Erreur lors de la création de la configuration WireGuard:', error);
    return {
      success: false,
      message: 'Erreur lors de la création de la configuration WireGuard',
      error: error.message
    };
  }
};

// Fonction pour créer un fichier de configuration client
export const createClientConfigFile = async (config) => {
  try {
    // Créer le répertoire de configuration s'il n'existe pas
    await fs.mkdir(WG_CONFIG_DIR, { recursive: true });
    
    // Créer le contenu du fichier de configuration
    const configContent = `[Interface]
PrivateKey = ${config.privateKey}
Address = ${config.ip}/24
DNS = 1.1.1.1, 8.8.8.8

[Peer]
PublicKey = ${config.serverPublicKey}
AllowedIPs = 0.0.0.0/0, ::/0
Endpoint = ${config.serverIp}:${config.serverPort}
PersistentKeepalive = 25
`;
    
    // Écrire le fichier de configuration
    const configPath = path.join(WG_CONFIG_DIR, `${config.walletAddress}.conf`);
    await fs.writeFile(configPath, configContent);
    
    console.log(`Fichier de configuration WireGuard créé: ${configPath}`);
    
    return {
      success: true,
      message: 'Fichier de configuration WireGuard créé avec succès',
      path: configPath
    };
  } catch (error) {
    console.error('Erreur lors de la création du fichier de configuration WireGuard:', error);
    return {
      success: false,
      message: 'Erreur lors de la création du fichier de configuration WireGuard',
      error: error.message
    };
  }
};

// Fonction pour récupérer la configuration WireGuard d'un client
export const getWireGuardConfig = async (walletAddress) => {
  try {
    // Récupérer la configuration depuis la base de données
    const config = await WireGuardConfig.findOne({ walletAddress });
    
    if (!config) {
      console.log(`Aucune configuration WireGuard trouvée pour ${walletAddress}`);
      return null;
    }
    
    console.log(`Configuration WireGuard récupérée pour ${walletAddress}`);
    
    return {
      walletAddress: config.walletAddress,
      publicKey: config.publicKey,
      privateKey: config.privateKey,
      ip: config.ip,
      port: config.port,
      serverPublicKey: config.serverPublicKey,
      serverIp: config.serverIp,
      serverPort: config.serverPort,
      createdAt: config.createdAt
    };
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration WireGuard:', error);
    return null;
  }
};

// Fonction pour supprimer la configuration WireGuard d'un client
export const deleteWireGuardConfig = async (walletAddress) => {
  try {
    // Supprimer la configuration de la base de données
    const result = await WireGuardConfig.deleteOne({ walletAddress });
    
    if (result.deletedCount === 0) {
      console.log(`Aucune configuration WireGuard trouvée pour ${walletAddress}`);
      return {
        success: false,
        message: 'Aucune configuration WireGuard trouvée'
      };
    }
    
    // Supprimer le fichier de configuration
    const configPath = path.join(WG_CONFIG_DIR, `${walletAddress}.conf`);
    
    try {
      await fs.unlink(configPath);
    } catch (err) {
      console.log(`Fichier de configuration non trouvé: ${configPath}`);
    }
    
    console.log(`Configuration WireGuard supprimée pour ${walletAddress}`);
    
    return {
      success: true,
      message: 'Configuration WireGuard supprimée avec succès'
    };
  } catch (error) {
    console.error('Erreur lors de la suppression de la configuration WireGuard:', error);
    return {
      success: false,
      message: 'Erreur lors de la suppression de la configuration WireGuard',
      error: error.message
    };
  }
};

// Fonction pour obtenir toutes les configurations WireGuard
export const getAllWireGuardConfigs = async () => {
  try {
    // Récupérer toutes les configurations depuis la base de données
    const configs = await WireGuardConfig.find({});
    
    console.log(`${configs.length} configurations WireGuard récupérées`);
    
    return {
      success: true,
      message: 'Configurations WireGuard récupérées avec succès',
      configs: configs.map(config => ({
        walletAddress: config.walletAddress,
        publicKey: config.publicKey,
        ip: config.ip,
        port: config.port,
        serverIp: config.serverIp,
        serverPort: config.serverPort,
        createdAt: config.createdAt
      }))
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des configurations WireGuard:', error);
    return {
      success: false,
      message: 'Erreur lors de la récupération des configurations WireGuard',
      error: error.message
    };
  }
};

export default {
  generateWireGuardKeyPair,
  createWireGuardConfig,
  getWireGuardConfig,
  deleteWireGuardConfig,
  getAllWireGuardConfigs,
  createClientConfigFile
};