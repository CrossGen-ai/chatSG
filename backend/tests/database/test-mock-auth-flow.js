#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const http = require('http');
const { getPool } = require('../../src/database/pool');
const { getUserByAzureId } = require('../../src/database/userRepository');

// Mock user data that should be created
const mockUser = {
  email: 'dev@example.com',
  name: 'Development User',
  groups: ['developers'],
  azureId: 'mock-azure-id'
};

async function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: options.method || 'GET',
      headers: {
        'X-CSRF-Token': 'test-token',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testMockAuthFlow() {
  console.log('=== Testing Mock Authentication Flow ===\n');
  
  const pool = getPool();
  
  try {
    // Check initial state
    console.log('1. Checking initial database state...');
    let dbUser = await getUserByAzureId(mockUser.azureId);
    if (dbUser) {
      console.log('✅ Mock user already exists in database');
      console.log('   Database ID:', dbUser.id);
      console.log('   Last login:', dbUser.last_login);
    } else {
      console.log('⚠️  Mock user not yet in database (will be created on first auth)');
    }
    console.log('');
    
    // Test authentication endpoint
    console.log('2. Testing /api/auth/user endpoint (should trigger authenticate middleware)...');
    try {
      const authResponse = await makeRequest('/api/auth/user');
      console.log('Response status:', authResponse.statusCode);
      
      if (authResponse.body) {
        const userData = JSON.parse(authResponse.body);
        console.log('Response body:', JSON.stringify(userData, null, 2));
        
        if (userData.isAuthenticated) {
          console.log('✅ User is authenticated');
          console.log('   User ID:', userData.user.id);
          console.log('   Email:', userData.user.email);
          console.log('   Azure ID:', userData.user.azureId);
        } else {
          console.log('❌ User is not authenticated');
        }
      }
    } catch (error) {
      console.log('⚠️  Could not connect to server. Is it running?');
      console.log('   Error:', error.message);
    }
    console.log('');
    
    // Check database after auth
    console.log('3. Checking database after authentication...');
    dbUser = await getUserByAzureId(mockUser.azureId);
    if (dbUser) {
      console.log('✅ Mock user exists in database after auth');
      console.log('   Database ID:', dbUser.id);
      console.log('   Email:', dbUser.email);
      console.log('   Name:', dbUser.name);
      console.log('   Groups:', dbUser.groups);
      console.log('   Last login:', dbUser.last_login);
      console.log('   Created at:', dbUser.created_at);
    } else {
      console.log('❌ Mock user still not in database');
    }
    console.log('');
    
    // Test protected endpoint
    console.log('4. Testing a protected endpoint...');
    try {
      const protectedResponse = await makeRequest('/api/sessions');
      console.log('Response status:', protectedResponse.statusCode);
      if (protectedResponse.statusCode === 200) {
        console.log('✅ Successfully accessed protected endpoint');
      } else {
        console.log('⚠️  Could not access protected endpoint');
      }
    } catch (error) {
      console.log('⚠️  Error accessing protected endpoint:', error.message);
    }
    console.log('');
    
    console.log('=== Summary ===');
    console.log('When mock auth is enabled (ENVIRONMENT=dev, USE_MOCK_AUTH=true):');
    console.log('1. The authenticate middleware automatically creates/updates the mock user in DB');
    console.log('2. The mock user gets a real database ID that persists across sessions');
    console.log('3. Every request updates the last_login timestamp');
    console.log('4. The user ID in req.user matches the database record');
    if (dbUser) {
      console.log('\nMock user database ID:', dbUser.id);
      console.log('This ID will be consistent across all sessions and restarts.');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Close the pool
    await pool.end();
    console.log('\nDatabase connection closed.');
  }
}

// Run the test
testMockAuthFlow().catch(console.error);