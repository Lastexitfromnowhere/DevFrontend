const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = process.env.PORT || 9000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '7df72b7a308fa9ac5d8f38e65a6e0308e04a63fd62b87cc36437c2a9dc4e04bd';
const DEPLOY_SCRIPT = '/var/www/vpn-backend/deploy.sh';
const LOG_DIR = '/var/www/vpn-backend/logs';
const LOG_FILE = path.join(LOG_DIR, 'webhook.log');

// Créer le répertoire de logs s'il n'existe pas
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Fonction de logging
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage);
}

const app = express();

// Middleware pour parser le body en raw format pour la vérification de signature
app.use(express.json({
  verify: (req, res, buf, encoding) => {
    if (buf && buf.length) {
      req.rawBody = buf.toString(encoding || 'utf8');
    }
  }
}));

// Route pour le webhook GitHub
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const event = req.headers['x-github-event'];

  log(`Webhook reçu: ${event}`);

  if (event !== 'push') {
    log(`Événement ignoré: ${event}`);
    return res.status(200).send('Événement ignoré');
  }

  if (WEBHOOK_SECRET && signature) {
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');

    if (signature !== digest) {
      log('Signature invalide');
      return res.status(403).send('Signature invalide');
    }

    log('Signature valide');
  } else {
    log('Aucune vérification de signature effectuée');
  }

  // ✅ Exécuter le script en arrière-plan avec nohup
  log('Démarrage du déploiement (détaché)');
  exec(`nohup bash ${DEPLOY_SCRIPT} > /dev/null 2>&1 &`);
  res.status(200).send('Déploiement en arrière-plan lancé');
});

// Route pour vérifier que le serveur est en cours d'exécution
app.get('/health', (req, res) => {
  res.status(200).send('Webhook server is running');
});

// Démarrer le serveur
app.listen(PORT, () => {
  log(`Serveur webhook démarré sur le port ${PORT}`);
});
