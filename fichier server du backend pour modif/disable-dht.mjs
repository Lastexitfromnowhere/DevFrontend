// disable-dht.mjs

// Fonction pour désactiver l'initialisation DHT
const disableDHT = () => {
  console.log('⚠️ Désactivation de l\'initialisation DHT dans le backend');
  
  // Remplacer la fonction d'initialisation DHT par une fonction qui ne fait rien
  if (global.initDHT) {
    const originalInitDHT = global.initDHT;
    global.initDHT = function() {
      console.log('⚠️ Initialisation DHT désactivée, utilisation du service DHT externe');
      return Promise.resolve({ success: true, disabled: true });
    };
  }
};

// Exporter la fonction
export { disableDHT };
