import { apiService } from '../services/apiService';
async function testApiService() {
  console.log('=== Test du service API ===');
  console.log('\n1. Test de la vérification du statut du backend:');
  const backendStatus = await apiService.checkBackendStatus();
  console.log('Statut du backend:', backendStatus);
  console.log('\n2. Test de la vérification du statut DHT:');
  const dhtStatus = await apiService.checkDHTStatus();
  console.log('Statut DHT:', dhtStatus);
  console.log('\n3. Test de la récupération des nœuds DHT:');
  const dhtNodes = await apiService.fetchDHTNodes();
  console.log('Nœuds DHT:', dhtNodes);
  console.log('\n4. Test de la gestion des erreurs avec une URL invalide:');
  try {
    const response = await fetch('http:
    console.log('Réponse (ne devrait pas s\'afficher):', response);
  } catch (error) {
    console.log('Erreur capturée:', error.message);
  }
  console.log('\n5. État hors ligne actuel:');
  console.log('Application hors ligne:', apiService.getOfflineStatus());
  console.log('\n6. Test du listener d\'état hors ligne:');
  const unsubscribe = apiService.addOfflineListener((isOffline) => {
    console.log('Changement d\'état détecté:', isOffline ? 'Hors ligne' : 'En ligne');
  });
  console.log('\nSimulation d\'un changement d\'état (pour le test uniquement):');
  apiService.setOfflineStatus = apiService.setOfflineStatus || function(status) {
    console.log('Simulation: changement d\'état vers', status ? 'hors ligne' : 'en ligne');
  };
  console.log('\n=== Fin du test ===');
}
export default testApiService;
