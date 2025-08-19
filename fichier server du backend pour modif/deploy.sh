#!/bin/bash

# Fichier de log
LOG_FILE="/var/www/vpn-backend/deploy.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=============================="
echo "🕒 Déploiement lancé : $(date)"
echo "=============================="

# Variables du projet
PROJECT_DIR="/var/www/vpn-backend"
REPO_URL="https://github.com/Lastexitfromnowhere/vps-backend-autodeployed.git"
BRANCH="main"
KEEP_FILES=("deploy.sh" ".env" "webhook.cjs")

cd "$PROJECT_DIR" || exit 1

echo "🧹 Suppression des anciens fichiers (sauf .env, deploy.sh, webhook.cjs)..."

for file in * .[^.]*; do
  skip=false
  for keep in "${KEEP_FILES[@]}"; do
    if [[ "$file" == "$keep" ]]; then
      skip=true
      break
    fi
  done

  if [ "$skip" = false ]; then
    echo "🗑️ Suppression : $file"
    rm -rf "$file"
  fi
done

echo "⬇️ Clonage depuis le dépôt GitHub..."
git clone --depth=1 -b "$BRANCH" "$REPO_URL" temp_repo

echo "📁 Déplacement des fichiers clonés..."
shopt -s dotglob
cp -r temp_repo/* .
rm -rf temp_repo

echo "📦 Installation des dépendances..."
npm install

echo "🔁 Redémarrage des services PM2..."
pm2 stop backend-api
pm2 stop dht-service
pm2 stop github-webhook

pm2 start server.js --name backend-api --node-args="--experimental-modules"
pm2 start dht-server.mjs --name dht-service
pm2 start webhook.cjs --name github-webhook

echo "💾 Sauvegarde de l'état PM2..."
pm2 save

echo "✅ Déploiement terminé avec succès à $(date)"
echo "=============================="
