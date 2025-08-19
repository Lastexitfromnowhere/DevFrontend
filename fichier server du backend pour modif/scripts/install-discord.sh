#!/bin/bash

# Script pour installer les dépendances manquantes
echo "🔍 Vérification et installation des dépendances manquantes..."

# Chemin du répertoire de travail
WORK_DIR="/var/www/vpn-backend"

# Se déplacer dans le répertoire de travail
cd $WORK_DIR || { echo "❌ Impossible d'accéder au répertoire $WORK_DIR"; exit 1; }

# Installer discord.js explicitement
echo "📦 Installation de discord.js..."
npm install discord.js --save

# Installer node-fetch si nécessaire
echo "📦 Installation de node-fetch..."
npm install node-fetch@3 --save

# Installer redis
echo "📦 Installation de redis..."
npm install redis --save

# Installer ioredis (alternative à redis)
echo "📦 Installation de ioredis..."
npm install ioredis --save

# Vérifier les dépendances dans package.json
echo "🔍 Vérification des dépendances dans package.json..."
npm install

# Redémarrer les services
echo "🔄 Redémarrage des services..."
pm2 restart backend-api || echo "⚠️ Impossible de redémarrer backend-api"

echo "✅ Installation des dépendances terminée"
