// src/utils/testApiService.js
// Script pour tester le service API et la gestion des erreurs

import { apiService } from '../services/apiService';

/**
 * Fonction pour tester les différentes fonctionnalités du service API
 */
async function testApiService() {
  console.log('=== Test du service API ===');
  
  // 1. Vérifier le statut du backend
  console.log('\n1. Test de la vérification du statut du backend:');
  const backendStatus = await apiService.checkBackendStatus();
  console.log('Statut du backend:', backendStatus);
  
  // 2. Vérifier le statut des nœuds DHT
  console.log('\n2. Test de la vérification du statut DHT:');
  const dhtStatus = await apiService.checkDHTStatus();
  console.log('Statut DHT:', dhtStatus);
  
  // 3. Récupérer les nœuds DHT
  console.log('\n3. Test de la récupération des nœuds DHT:');
  const dhtNodes = await apiService.fetchDHTNodes();
  console.log('Nœuds DHT:', dhtNodes);
  
  // 4. Tester la gestion des erreurs avec une URL invalide
  console.log('\n4. Test de la gestion des erreurs avec une URL invalide:');
  try {
    // Forcer une erreur en utilisant une URL qui n'existe pas
    const response = await fetch('http://non-existent-url.example');
    console.log('Réponse (ne devrait pas s\'afficher):', response);
  } catch (error) {
    console.log('Erreur capturée:', error.message);
  }
  
  // 5. Vérifier l'état hors ligne
  console.log('\n5. État hors ligne actuel:');
  console.log('Application hors ligne:', apiService.getOfflineStatus());
  
  // 6. Ajouter un listener pour les changements d'état
  console.log('\n6. Test du listener d\'état hors ligne:');
  const unsubscribe = apiService.addOfflineListener((isOffline) => {
    console.log('Changement d\'état détecté:', isOffline ? 'Hors ligne' : 'En ligne');
  });
  
  // Simuler un changement d'état (ceci est juste pour le test, normalement c'est géré en interne)
  console.log('\nSimulation d\'un changement d\'état (pour le test uniquement):');
  apiService.setOfflineStatus = apiService.setOfflineStatus || function(status) {
    console.log('Simulation: changement d\'état vers', status ? 'hors ligne' : 'en ligne');
  };
  
  console.log('\n=== Fin du test ===');
}

// Exporter la fonction de test
export default testApiService;
