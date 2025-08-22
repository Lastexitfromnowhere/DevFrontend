const axios = require('axios');
const config = {
  DHT_API_URL: 'https:
  LOCAL_DHT_URL: 'http:
  FRONTEND_DHT_URL: '/dht'                            
};
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
async function runTests() {
  console.log('🔍 Testing DHT Endpoints...');
  console.log('==========================');
  await testEndpoint(`${config.DHT_API_URL}/status`);
  await testEndpoint(`${config.LOCAL_DHT_URL}/status`);
  await testEndpoint(`${config.DHT_API_URL}/start`, 'post', {});
  await testEndpoint(`${config.DHT_API_URL}/stop`, 'post', {});
  await testEndpoint(`${config.DHT_API_URL}/nodes`);
  await testEndpoint(`${config.DHT_API_URL}/wireguard-nodes`);
  console.log('==========================');
  console.log('🏁 Tests completed');
}
runTests().catch(err => {
  console.error('❌ Fatal error running tests:', err);
});
