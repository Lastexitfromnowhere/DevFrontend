import Redis from 'ioredis';

// Créer une connexion Redis
const redis = new Redis(process.env.REDIS_URI || 'redis://default:10FLlkZJ6ojUJcxnxLRA5qFOSkVDmnnV@redis-12102.c279.us-central1-1.gce.redns.redis-cloud.com:12102');

// Fonction pour vérifier les clés Redis
async function checkRedisKeys() {
  try {
    console.log('Connexion à Redis...');
    
    // Vérifier la connexion
    const pingResult = await redis.ping();
    console.log('Ping Redis:', pingResult);
    
    // Récupérer toutes les clés DHT
    console.log('\nRecherche de clés DHT dans Redis:');
    const keys = await redis.keys('dht:*');
    
    if (keys.length === 0) {
      console.log('Aucune clé DHT trouvée dans Redis');
    } else {
      console.log(`${keys.length} clés DHT trouvées:`);
      for (const key of keys) {
        console.log(`- ${key}`);
        
        // Récupérer le contenu de la clé
        const value = await redis.get(key);
        try {
          const parsedValue = JSON.parse(value);
          console.log('  Contenu:', JSON.stringify(parsedValue, null, 2).substring(0, 200) + (JSON.stringify(parsedValue).length > 200 ? '...' : ''));
        } catch (e) {
          console.log('  Contenu (non-JSON):', value.substring(0, 100) + (value.length > 100 ? '...' : ''));
        }
        
        // Vérifier le TTL de la clé
        const ttl = await redis.ttl(key);
        console.log(`  TTL: ${ttl} secondes`);
        console.log('---');
      }
    }
    
    // Vérifier si le client Redis est fonctionnel
    console.log('\nTest d\'écriture dans Redis:');
    const testKey = 'test:dht:' + Date.now();
    const setResult = await redis.set(testKey, 'test-value', 'EX', 60);
    console.log(`Résultat de l'écriture: ${setResult}`);
    
    const testValue = await redis.get(testKey);
    console.log(`Valeur lue: ${testValue}`);
    
    // Supprimer la clé de test
    await redis.del(testKey);
    
  } catch (error) {
    console.error('Erreur lors de la vérification des clés Redis:', error);
  } finally {
    // Fermer la connexion Redis
    redis.disconnect();
  }
}

// Exécuter la fonction
checkRedisKeys();
