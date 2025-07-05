const axios = require('axios');

async function testHTMLTitle() {
  const axiosInstance = axios.create({
    withCredentials: true,
    baseURL: 'http://localhost:3000',
    timeout: 10000
  });

  try {
    // Get CSRF token
    const configResponse = await axiosInstance.get('/api/config/security');
    const csrfToken = configResponse.headers['x-csrf-token'];
    
    // Try to create chat with HTML
    const createResponse = await axiosInstance.post('/api/chats', {
      title: '<script>alert("XSS")</script>Chat'
    }, {
      headers: {
        'X-CSRF-Token': csrfToken
      }
    });
    
    console.log('Response:', createResponse.data);
    
  } catch (error) {
    console.error('Error:', error.response?.status, error.response?.data);
  }
}

testHTMLTitle();