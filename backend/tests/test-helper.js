/**
 * Test Helper - Simplifies API testing with CSRF
 */

const axios = require('axios');

class TestClient {
  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL;
    this.csrfToken = null;
    this.cookies = '';
  }

  /**
   * Initialize client by getting CSRF token
   */
  async init() {
    try {
      const response = await axios.get(`${this.baseURL}/api/config/security`);
      
      // Extract CSRF token from cookies
      const setCookie = response.headers['set-cookie'];
      if (setCookie) {
        const cookieArray = Array.isArray(setCookie) ? setCookie : [setCookie];
        cookieArray.forEach(cookie => {
          if (cookie.includes('csrf-token=')) {
            const match = cookie.match(/csrf-token=([^;]+)/);
            if (match) {
              this.csrfToken = match[1];
              this.cookies = `csrf-token=${this.csrfToken}`;
            }
          }
        });
      }
      
      console.log('Test client initialized with CSRF token');
      return this;
    } catch (error) {
      console.error('Failed to initialize test client:', error.message);
      throw error;
    }
  }

  /**
   * Send a chat message
   */
  async sendMessage(message, sessionId = 'test-session') {
    if (!this.csrfToken) {
      await this.init();
    }

    return axios.post(
      `${this.baseURL}/api/chat`,
      { message, sessionId },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.csrfToken,
          'Cookie': this.cookies
        },
        timeout: 5000
      }
    );
  }

  /**
   * Make any API request with CSRF token
   */
  async request(method, url, data = null) {
    if (!this.csrfToken) {
      await this.init();
    }

    const config = {
      method,
      url: `${this.baseURL}${url}`,
      headers: {
        'X-CSRF-Token': this.csrfToken,
        'Cookie': this.cookies
      }
    };

    if (data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }

    return axios(config);
  }
}

// Example usage
async function testExample() {
  const client = new TestClient();
  
  try {
    // Initialize client (gets CSRF token)
    await client.init();
    
    // Send a test message
    const response = await client.sendMessage('Hello from test client!');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Export for use in other tests
module.exports = { TestClient };

// Run example if called directly
if (require.main === module) {
  testExample();
}