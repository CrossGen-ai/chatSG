const path = require('path');
const fs = require('fs');

// Load environment variables (dotenv will look for .env in current directory)
require('dotenv').config();

// Debug logging to see what environment is loaded
console.log('=== ENVIRONMENT DEBUG ===');
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('process.env.ENVIRONMENT:', process.env.ENVIRONMENT);
console.log('========================');

const http = require('http');
const https = require('https');
const { exec } = require('child_process');
const axios = require('axios');

const PORT = process.env.PORT || 3000;
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:5678/webhook/chat';
const ENVIRONMENT = process.env.ENVIRONMENT || 'production';

// Debug logging to see what environment is loaded
console.log('=== ENVIRONMENT DEBUG ===');
console.log('process.env.ENVIRONMENT:', process.env.ENVIRONMENT);
console.log('ENVIRONMENT variable:', ENVIRONMENT);
console.log('========================');

// Azure OpenAI configuration for GCC High
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT; // e.g., 'https://your-resource-name.openai.azure.us'
const AZURE_OPENAI_DEPLOYMENT = 'gpt-4o-001'; // Hardcoded deployment name

// Function to check if error is a network access error
function isNetworkAccessError(error) {
    return error && 
           error.error && 
           error.error.code === '403' && 
           error.error.message.includes('Virtual Network/Firewall');
}

// Function to get IP addresses
function getIPAddresses() {
    return new Promise((resolve, reject) => {
        exec('hostname -I', (error, stdout, stderr) => {
            if (error) {
                console.error('Error getting IP addresses:', error);
                resolve({ private: 'unknown' });
                return;
            }
            const privateIP = stdout.trim().split(' ')[0];
            resolve({ private: privateIP });
        });
    });
}

// Simulated n8n responses for development mode
function getSimulatedN8nResponse(message) {
    const responses = [
        "Hello! I'm a simulated n8n response. I received your message: '" + message + "'. How can I help you today?",
        "This is a development simulation of the n8n workflow. Your message '" + message + "' has been processed successfully!",
        "n8n Dev Mode: I understand you said '" + message + "'. Here's a simulated intelligent response based on your input.",
        "Simulated AI Response: Thank you for your message '" + message + "'. In production, this would be processed by the actual n8n workflow.",
        "Development Mode Active: Your query '" + message + "' would normally trigger complex workflows. This is a mock response for testing."
    ];
    
    // Add some variety based on message content
    if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
        return "Hello! This is a simulated n8n greeting response. I'm running in development mode and ready to help!";
    }
    if (message.toLowerCase().includes('how are you')) {
        return "I'm doing great! This is a simulated n8n response. In dev mode, I'm always ready to assist with testing.";
    }
    if (message.toLowerCase().includes('joke')) {
        return "Here's a dev joke: Why do programmers prefer dark mode? Because light attracts bugs! 🐛 (This is a simulated n8n response)";
    }
    if (message.toLowerCase().includes('what can you do')) {
        return "In development mode, I simulate n8n workflow responses. In production, I would connect to real AI services and complex automations!";
    }
    
    // Return a random response for other messages
    return responses[Math.floor(Math.random() * responses.length)];
}

const server = http.createServer(async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/') {
        // Serve the React app's index.html
        fs.readFile(path.join(__dirname, 'public', 'index.html'), (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading index.html');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content);
        });
    } else if (req.url.startsWith('/assets/') || req.url.endsWith('.png') || req.url.endsWith('.ico') || req.url.endsWith('.js') || req.url.endsWith('.css')) {
        // Serve static assets from the public directory
        const filePath = path.join(__dirname, 'public', req.url);
        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(404);
                res.end('File not found');
                return;
            }
            
            // Set appropriate content type
            let contentType = 'text/plain';
            if (req.url.endsWith('.js')) contentType = 'application/javascript';
            else if (req.url.endsWith('.css')) contentType = 'text/css';
            else if (req.url.endsWith('.png')) contentType = 'image/png';
            else if (req.url.endsWith('.ico')) contentType = 'image/x-icon';
            else if (req.url.endsWith('.html')) contentType = 'text/html';
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        });
    } else if (req.url === '/api/chat' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                
                // Check if we're in development mode
                if (ENVIRONMENT === 'dev') {
                    console.log(`[DEV MODE] Simulating n8n response for message: "${data.message}"`);
                    
                    // Simulate some processing delay (like a real API call)
                    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
                    
                    const simulatedResponse = getSimulatedN8nResponse(data.message);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        message: simulatedResponse,
                        _dev_mode: true,
                        _original_message: data.message
                    }));
                } else {
                    // Production mode - forward to actual webhook
                    console.log(`[PRODUCTION] Forwarding to webhook: ${WEBHOOK_URL}`);
                    const response = await axios.post(WEBHOOK_URL, { message: data.message });
                    const output = response.data.output || 'No output from webhook.';
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: output }));
                }
            } catch (error) {
                console.error('Chat API error:', error);
                res.writeHead(500);
                res.end(JSON.stringify({ 
                    error: ENVIRONMENT === 'dev' ? 'Development simulation error' : 'Webhook error', 
                    details: error.message 
                }));
            }
        });
    } else if (req.url === '/webhook-test/chat' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ output: `Mock n8n: ${data.message}` }));
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid request' }));
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

// Start the server and log configuration
getIPAddresses().then(ips => {
    server.listen(PORT, () => {
        console.log('Server Configuration:');
        console.log(`- Server running at http://localhost:${PORT}/`);
        console.log(`- Environment: ${ENVIRONMENT}`);
        console.log(`- Mode: ${ENVIRONMENT === 'dev' ? 'DEVELOPMENT (Simulated n8n responses)' : 'PRODUCTION (Real webhook)'}`);
        console.log(`- Webhook URL: ${WEBHOOK_URL}`);
        console.log(`- Using deployment: ${AZURE_OPENAI_DEPLOYMENT}`);
        console.log(`- Endpoint: ${AZURE_OPENAI_ENDPOINT}`);
        console.log(`- VNet IP: ${ips.private}`);
    });
}); 