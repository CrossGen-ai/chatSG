/**
 * Test Chat Performance
 * 
 * Makes real API calls to test performance monitoring
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const SESSION_ID = 'perf-test-' + Date.now();

// Simple test messages
const TEST_MESSAGES = [
    "Hello",
    "What is 2+2?",
    "Tell me a joke"
];

async function makeAuthenticatedRequest(endpoint, method = 'GET', data = null) {
    try {
        const response = await axios({
            method,
            url: `${API_BASE}${endpoint}`,
            data,
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'connect.sid=mock-session' // Mock auth
            }
        });
        return response.data;
    } catch (error) {
        console.error(`Request failed: ${method} ${endpoint}`, error.response?.data || error.message);
        throw error;
    }
}

async function createSession() {
    console.log('Creating session:', SESSION_ID);
    const session = await makeAuthenticatedRequest('/api/chats', 'POST', {
        title: 'Performance Test',
        sessionId: SESSION_ID
    });
    return session;
}

async function sendMessage(message) {
    console.log(`\nSending: "${message}"`);
    const startTime = Date.now();
    
    try {
        const response = await axios.post(
            `${API_BASE}/api/chats/${SESSION_ID}/messages`,
            { 
                message,
                activeSessionId: SESSION_ID
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': 'connect.sid=mock-session'
                },
                responseType: 'stream',
                timeout: 30000 // 30 second timeout
            }
        );
        
        let fullResponse = '';
        let firstTokenTime = null;
        let tokenCount = 0;
        
        return new Promise((resolve, reject) => {
            response.data.on('data', (chunk) => {
                const lines = chunk.toString().split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            if (data.content) {
                                if (!firstTokenTime) {
                                    firstTokenTime = Date.now();
                                    console.log(`  First token: ${firstTokenTime - startTime}ms`);
                                }
                                fullResponse += data.content;
                                tokenCount++;
                                process.stdout.write('.');
                            } else if (data.type === 'done') {
                                console.log('\n  Response complete');
                                const totalTime = Date.now() - startTime;
                                console.log(`  Total time: ${totalTime}ms`);
                                console.log(`  Tokens: ${tokenCount}`);
                                if (firstTokenTime) {
                                    console.log(`  TTFT: ${firstTokenTime - startTime}ms`);
                                    console.log(`  Stream time: ${totalTime - (firstTokenTime - startTime)}ms`);
                                }
                                resolve({
                                    response: fullResponse,
                                    totalTime,
                                    ttft: firstTokenTime ? firstTokenTime - startTime : 0,
                                    tokenCount
                                });
                            }
                        } catch (e) {
                            // Ignore parse errors
                        }
                    }
                }
            });
            
            response.data.on('error', reject);
        });
    } catch (error) {
        console.error('Message failed:', error.message);
        throw error;
    }
}

async function checkPerformanceDashboard() {
    try {
        const dashboard = await makeAuthenticatedRequest('/api/performance/dashboard');
        return dashboard;
    } catch (error) {
        console.log('Performance dashboard not available yet');
        return null;
    }
}

async function main() {
    console.log('=== ChatSG Performance Test ===\n');
    console.log('Performance Monitoring:', process.env.ENABLE_PERFORMANCE_MONITORING);
    
    try {
        // Create session
        await createSession();
        
        // Send test messages
        const results = [];
        for (const message of TEST_MESSAGES) {
            const result = await sendMessage(message);
            results.push({
                message,
                totalTime: result.totalTime,
                ttft: result.ttft,
                tokens: result.tokenCount
            });
            
            // Short delay between messages
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Show results
        console.log('\n=== Performance Summary ===\n');
        console.table(results);
        
        // Calculate averages
        const avgTotal = results.reduce((sum, r) => sum + r.totalTime, 0) / results.length;
        const avgTTFT = results.reduce((sum, r) => sum + r.ttft, 0) / results.length;
        
        console.log('\nAverages:');
        console.log(`- Total time: ${avgTotal.toFixed(0)}ms`);
        console.log(`- TTFT: ${avgTTFT.toFixed(0)}ms`);
        
        // Check performance dashboard
        console.log('\n=== Performance Dashboard ===\n');
        const dashboard = await checkPerformanceDashboard();
        if (dashboard && dashboard.enabled) {
            console.log('Dashboard available!');
            console.log(JSON.stringify(dashboard, null, 2));
        } else {
            console.log('Dashboard not enabled. Add performance monitoring to server.js');
        }
        
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

main();