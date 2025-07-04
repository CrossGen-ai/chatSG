/**
 * Test Authentication Endpoints
 * Verifies that auth routes are properly configured
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testAuthEndpoints() {
    console.log('🔐 Testing Authentication Endpoints\n');
    
    const tests = [
        {
            name: 'Get current user (unauthenticated)',
            method: 'GET',
            url: '/auth/user',
            expectedStatus: 200,
            checkResponse: (data) => {
                return data.user === null;
            }
        },
        {
            name: 'Login endpoint exists',
            method: 'GET',
            url: '/auth/login',
            expectedStatus: [302, 303], // Redirect to Azure AD
            skipResponseCheck: true
        },
        {
            name: 'Logout endpoint exists',
            method: 'POST',
            url: '/auth/logout',
            expectedStatus: 200,
            checkResponse: (data) => {
                return data.success === true;
            }
        }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            console.log(`Testing: ${test.name}`);
            const response = await axios({
                method: test.method,
                url: `${API_BASE}${test.url}`,
                validateStatus: () => true, // Don't throw on any status
                maxRedirects: 0 // Don't follow redirects
            });
            
            // Check status code
            const expectedStatuses = Array.isArray(test.expectedStatus) 
                ? test.expectedStatus 
                : [test.expectedStatus];
            
            if (expectedStatuses.includes(response.status)) {
                // Check response data if needed
                if (!test.skipResponseCheck && test.checkResponse) {
                    if (test.checkResponse(response.data)) {
                        console.log(`✅ ${test.name} - Status: ${response.status}`);
                        passed++;
                    } else {
                        console.log(`❌ ${test.name} - Invalid response data`);
                        console.log('   Response:', response.data);
                        failed++;
                    }
                } else {
                    console.log(`✅ ${test.name} - Status: ${response.status}`);
                    passed++;
                }
            } else {
                console.log(`❌ ${test.name} - Expected status ${test.expectedStatus}, got ${response.status}`);
                failed++;
            }
        } catch (error) {
            console.log(`❌ ${test.name} - Error: ${error.message}`);
            failed++;
        }
    }
    
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
        console.log('\n✅ All auth endpoint tests passed!');
    } else {
        console.log('\n❌ Some tests failed');
        process.exit(1);
    }
}

// Add environment setup note
console.log('📌 Make sure to set these environment variables:');
console.log('   USE_MOCK_AUTH=true');
console.log('   NODE_ENV=development');
console.log('   Or configure Azure AD credentials\n');

// Run tests
testAuthEndpoints().catch(console.error);