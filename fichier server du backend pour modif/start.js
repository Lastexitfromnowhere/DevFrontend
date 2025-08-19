# Créer un fichier start.js qui importe d'abord le polyfill
echo "// start.js
import './polyfill.js';
import './server.js';" > /var/www/vpn-backend/start.js
