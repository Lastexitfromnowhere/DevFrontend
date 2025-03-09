// scripts/test-dht-endpoints.js
const axios = require('axios');

// Configuration
const config = {
  DHT_API_URL: 'https://lastexitvpn.duckdns.org/dht', // URL externe via Nginx
  LOCAL_DHT_URL: 'http://46.101.36.247:10001/dht',    // URL directe pour comparaison
  FRONTEND_DHT_URL: '/dht'                            // URL relative par Next.js
};

// Fonction utilitaire pour les tests
async function testEndpoint(url, method = 'get', data = null) {
  console.log(`Testing ${method.toUpperCase()} ${url}...`);
  try {
    const response = data 
      ? await axios[method](url, data) 
      : await axios[method](url);
    
    console.log(`✅ Success: ${method.toUpperCase()} ${url}`);
    console.log(`Status: ${response.status}`);
    console.log(`Headers:`, response.headers);
    console.log(`Data:`, response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`❌ Error: ${method.toUpperCase()} ${url}`);
    console.error(`Status: ${error.response?.status || 'N/A'}`);
    console.error(`Message: ${error.message}`);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response headers:', error.response.headers);
    }
    return { success: false, error };
  }
}

// Tester tous les endpoints DHT importants
async function runTests() {
  console.log('🔍 Testing DHT Endpoints...');
  console.log('==========================');
  
  // 1. Test du status via Nginx
  await testEndpoint(`${config.DHT_API_URL}/status`);
  
  // 2. Test du status direct (pour comparaison)
  await testEndpoint(`${config.LOCAL_DHT_URL}/status`);
  
  // 3. Test du endpoint start via Nginx (POST)
  await testEndpoint(`${config.DHT_API_URL}/start`, 'post', {});
  
  // 4. Test du endpoint stop via Nginx (POST)
  await testEndpoint(`${config.DHT_API_URL}/stop`, 'post', {});
  
  // 5. Test du endpoint nodes via Nginx
  await testEndpoint(`${config.DHT_API_URL}/nodes`);
  
  // 6. Test du endpoint wireguard-nodes via Nginx
  await testEndpoint(`${config.DHT_API_URL}/wireguard-nodes`);
  
  console.log('==========================');
  console.log('🏁 Tests completed');
}

// Exécuter les tests
runTests().catch(err => {
  console.error('❌ Fatal error running tests:', err);
});
