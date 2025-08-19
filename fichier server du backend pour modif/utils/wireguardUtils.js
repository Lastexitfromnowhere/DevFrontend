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

// Obtenir le chemin du r�pertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin vers le r�pertoire des configurations WireGuard
const WG_CONFIG_DIR = process.env.WG_CONFIG_DIR || path.join(__dirname, '..', 'wireguard-configs');

// Adresse IP du serveur VPN
const SERVER_IP = process.env.SERVER_IP || '46.101.36.247';
const SERVER_PORT = process.env.WG_PORT || 51820;
const SERVER_PUBLIC_KEY = process.env.WG_PUBLIC_KEY || 'votre-cl�-publique-wireguard';

// Plage d'adresses IP pour les clients
const CLIENT_IP_RANGE = '10.8.0.';
let lastClientIpIndex = 2; // Commencer � .2 car .1 est g�n�ralement r�serv� pour le serveur

// Fonction pour g�n�rer une paire de cl�s WireGuard
export const generateWireGuardKeyPair = async () => {
  try {
    if (process.env.NODE_ENV === 'development' && process.env.SIMULATE_WG === 'true') {
      // En mode d�veloppement, simuler la g�n�ration de cl�s
      console.log('Simulation de la g�n�ration de cl�s WireGuard en mode d�veloppement');
      const privateKey = crypto.randomBytes(32).toString('base64');
      const publicKey = crypto.randomBytes(32).toString('base64');
      return { privateKey, publicKey };
    }

    // G�n�rer la cl� priv�e
    const { stdout: privateKey } = await execAsync('wg genkey');
    
    // G�n�rer la cl� publique � partir de la cl� priv�e
    const { stdout: publicKey } = await execAsync(`echo "${privateKey.trim()}" | wg pubkey`);
    
    return {
      privateKey: privateKey.trim(),
      publicKey: publicKey.trim()
    };
  } catch (error) {
    console.error('Erreur lors de la g�n�ration des cl�s WireGuard:', error);
    
    // En cas d'erreur, g�n�rer des cl�s simul�es
    const privateKey = crypto.randomBytes(32).toString('base64');
    const publicKey = crypto.randomBytes(32).toString('base64');
    
    return { privateKey, publicKey };
  }
};

// Fonction pour cr�er une configuration WireGuard pour un client
export const createWireGuardConfig = async (walletAddress) => {
  try {
    // V�rifier si une configuration existe d�j� pour cette adresse de wallet
    let config = await WireGuardConfig.findOne({ walletAddress });
    
    if (config) {
      console.log(`Configuration WireGuard existante trouv�e pour ${walletAddress}`);
      return {
        success: true,
        message: 'Configuration WireGuard existante r�cup�r�e',
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
    
    // G�n�rer une nouvelle paire de cl�s
    const { privateKey, publicKey } = await generateWireGuardKeyPair();
    
    // Attribuer une adresse IP au client
    const clientIp = CLIENT_IP_RANGE + (lastClientIpIndex++);
    
    // Cr�er la configuration
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
    
    // Sauvegarder la configuration dans la base de donn�es
    await config.save();
    
    console.log(`Nouvelle configuration WireGuard cr��e pour ${walletAddress}`);
    
    // Cr�er le fichier de configuration client
    await createClientConfigFile(config);
    
    return {
      success: true,
      message: 'Configuration WireGuard cr��e avec succ�s',
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
    console.error('Erreur lors de la cr�ation de la configuration WireGuard:', error);
    return {
      success: false,
      message: 'Erreur lors de la cr�ation de la configuration WireGuard',
      error: error.message
    };
  }
};

// Fonction pour cr�er un fichier de configuration client
export const createClientConfigFile = async (config) => {
  try {
    // Cr�er le r�pertoire de configuration s'il n'existe pas
    await fs.mkdir(WG_CONFIG_DIR, { recursive: true });
    
    // Cr�er le contenu du fichier de configuration
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
    
    // �crire le fichier de configuration
    const configPath = path.join(WG_CONFIG_DIR, `${config.walletAddress}.conf`);
    await fs.writeFile(configPath, configContent);
    
    console.log(`Fichier de configuration WireGuard cr��: ${configPath}`);
    
    return {
      success: true,
      message: 'Fichier de configuration WireGuard cr�� avec succ�s',
      path: configPath
    };
  } catch (error) {
    console.error('Erreur lors de la cr�ation du fichier de configuration WireGuard:', error);
    return {
      success: false,
      message: 'Erreur lors de la cr�ation du fichier de configuration WireGuard',
      error: error.message
    };
  }
};

// Fonction pour r�cup�rer la configuration WireGuard d'un client
export const getWireGuardConfig = async (walletAddress) => {
  try {
    // R�cup�rer la configuration depuis la base de donn�es
    const config = await WireGuardConfig.findOne({ walletAddress });
    
    if (!config) {
      console.log(`Aucune configuration WireGuard trouv�e pour ${walletAddress}`);
      return null;
    }
    
    console.log(`Configuration WireGuard r�cup�r�e pour ${walletAddress}`);
    
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
    console.error('Erreur lors de la r�cup�ration de la configuration WireGuard:', error);
    return null;
  }
};

// Fonction pour supprimer la configuration WireGuard d'un client
export const deleteWireGuardConfig = async (walletAddress) => {
  try {
    // Supprimer la configuration de la base de donn�es
    const result = await WireGuardConfig.deleteOne({ walletAddress });
    
    if (result.deletedCount === 0) {
      console.log(`Aucune configuration WireGuard trouv�e pour ${walletAddress}`);
      return {
        success: false,
        message: 'Aucune configuration WireGuard trouv�e'
      };
    }
    
    // Supprimer le fichier de configuration
    const configPath = path.join(WG_CONFIG_DIR, `${walletAddress}.conf`);
    
    try {
      await fs.unlink(configPath);
    } catch (err) {
      console.log(`Fichier de configuration non trouv�: ${configPath}`);
    }
    
    console.log(`Configuration WireGuard supprim�e pour ${walletAddress}`);
    
    return {
      success: true,
      message: 'Configuration WireGuard supprim�e avec succ�s'
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
    // R�cup�rer toutes les configurations depuis la base de donn�es
    const configs = await WireGuardConfig.find({});
    
    console.log(`${configs.length} configurations WireGuard r�cup�r�es`);
    
    return {
      success: true,
      message: 'Configurations WireGuard r�cup�r�es avec succ�s',
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
    console.error('Erreur lors de la r�cup�ration des configurations WireGuard:', error);
    return {
      success: false,
      message: 'Erreur lors de la r�cup�ration des configurations WireGuard',
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