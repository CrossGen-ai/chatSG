const path = require('path');
const fs = require('fs');

// Load environment variables (dotenv will look for .env in current directory)
require('dotenv').config();

// Debug logging to see what environment is loaded
console.log('=== ENVIRONMENT DEBUG ===');
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('process.env.ENVIRONMENT:', process.env.ENVIRONMENT);
console.log('process.env.BACKEND:', process.env.BACKEND);
console.log('========================');

const http = require('http');
const https = require('https');
const { exec } = require('child_process');
const axios = require('axios');

// Import orchestrator modules
const { createOrchestrationSetup, createBackendIntegration } = require('./dist/src/routing');

// Import orchestrator agent factory
const { OrchestratorAgentFactory } = require('./dist/src/agents/individual/IndividualAgentFactory');

const PORT = process.env.PORT || 3000;
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:5678/webhook/chat';
const ENVIRONMENT = process.env.ENVIRONMENT || 'production'; // Legacy support
const BACKEND = process.env.BACKEND || 'Orch'; // New backend routing: 'Orch', 'n8n', 'Generic'

// Initialize Orchestrator if using Orch backend
let orchestrationSetup = null;
let backendIntegration = null;
if (BACKEND === 'Orch') {
    try {
        orchestrationSetup = createOrchestrationSetup('development');
        backendIntegration = createBackendIntegration(orchestrationSetup.orchestrator, orchestrationSetup.middleware);
        
        // Create and register specialized LLM-powered agents
        let agents = [];
        try {
            const agentCreationResult = OrchestratorAgentFactory.createAgentsWithFallback();
            agents = agentCreationResult.agents;
            
            if (agentCreationResult.warnings.length > 0) {
                console.warn('[Orchestrator] Agent creation warnings:', agentCreationResult.warnings);
            }
            
            if (agentCreationResult.errors.length > 0) {
                console.error('[Orchestrator] Agent creation errors:', agentCreationResult.errors);
            }
            
            if (agentCreationResult.success && agents.length > 0) {
                // Register each agent with the orchestrator
                agents.forEach(agent => {
                    try {
                        orchestrationSetup.orchestrator.registerAgent(agent);
                        const agentInfo = agent.getInfo();
                        console.log(`[Orchestrator] Registered ${agentInfo.name} (${agentInfo.type}) - ${agentInfo.description}`);
                    } catch (regError) {
                        console.error(`[Orchestrator] Failed to register agent ${agent.constructor.name}:`, regError);
                    }
                });
                console.log(`[Orchestrator] Successfully registered ${agents.length} specialized LLM agents`);
            } else {
                console.warn('[Orchestrator] No specialized agents were created - orchestrator will run with limited functionality');
            }
        } catch (agentError) {
            console.error('[Orchestrator] Failed to create specialized agents:', agentError);
            console.log('[Orchestrator] Continuing with basic orchestrator functionality');
        }
        
        // Initialize with specialized agents only
        (async () => {
            try {
                await backendIntegration.initialize({ agents });
                console.log(`[Orchestrator] Initialized with ${agents.length} specialized agents`);
            } catch (error) {
                console.error('[Orchestrator] Failed to initialize:', error);
            }
        })();
        console.log('[Orchestrator] Setup created successfully');
    } catch (error) {
        console.error('[Orchestrator] Failed to initialize:', error);
    }
}

// Debug logging to see what backend mode is loaded
console.log('=== BACKEND CONFIGURATION ===');
console.log('BACKEND mode:', BACKEND);
console.log('Legacy ENVIRONMENT:', ENVIRONMENT);
console.log('Active backend:', getBackendMode());
console.log('Orchestrator initialized:', orchestrationSetup !== null);
console.log('=============================');

// Function to determine backend mode
function getBackendMode() {
    switch (BACKEND) {
        case 'Orch':
            return 'Enhanced Orchestrator (Multi-Agent)';
        case 'n8n':
            return 'n8n Webhook (Production)';
        case 'Generic':
            return 'Generic Simulation (Development)';
        default:
            // Legacy support - check old ENVIRONMENT variable
            if (ENVIRONMENT === 'dev') {
                return 'Generic Simulation (Legacy Dev Mode)';
            }
            return 'n8n Webhook (Default Production)';
    }
}

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
                const sessionId = data.sessionId || 'default';
                
                // Route based on BACKEND configuration
                switch (BACKEND) {
                    case 'Orch':
                        // Enhanced Orchestrator mode
                        if (!backendIntegration) {
                            throw new Error('Orchestrator not initialized');
                        }
                        console.log(`[ORCHESTRATOR] Processing with enhanced orchestration: "${data.message}"`);
                        
                        // Use middleware directly instead of createEnhancedChatHandler
                        const orchResult = await orchestrationSetup.middleware.handleChatRequest(
                            data.message,
                            sessionId,
                            'orchestrator',
                            req,
                            res,
                            async (msg, sid) => {
                                // Fallback handler - simple orchestrator response
                                return {
                                    message: `Orchestrator processed: ${msg}`,
                                    success: true,
                                    sessionId: sid,
                                    timestamp: new Date().toISOString()
                                };
                            }
                        );
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(orchResult.response));
                        break;
                        
                    case 'n8n':
                        // n8n Webhook mode (Production)
                        console.log(`[N8N] Forwarding to webhook: ${WEBHOOK_URL}`);
                        const response = await axios.post(WEBHOOK_URL, { message: data.message });
                        const output = response.data.output || 'No output from webhook.';
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            message: output,
                            _backend: 'n8n',
                            _webhook: WEBHOOK_URL
                        }));
                        break;
                        
                    case 'Generic':
                        // Generic simulation mode (Development)
                        console.log(`[GENERIC] Simulating response for message: "${data.message}"`);
                        
                        // Simulate some processing delay (like a real API call)
                        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
                        
                        const simulatedResponse = getSimulatedN8nResponse(data.message);
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            message: simulatedResponse,
                            _backend: 'Generic',
                            _simulation: true,
                            _original_message: data.message
                        }));
                        break;
                        
                    default:
                        // Legacy support - check old ENVIRONMENT variable
                        if (ENVIRONMENT === 'dev') {
                            console.log(`[LEGACY DEV] Simulating response for message: "${data.message}"`);
                            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
                            const legacyResponse = getSimulatedN8nResponse(data.message);
                            
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ 
                                message: legacyResponse,
                                _backend: 'Legacy',
                                _mode: 'dev',
                                _original_message: data.message
                            }));
                        } else {
                            // Default to n8n webhook
                            console.log(`[DEFAULT] Forwarding to webhook: ${WEBHOOK_URL}`);
                            const defaultResponse = await axios.post(WEBHOOK_URL, { message: data.message });
                            const defaultOutput = defaultResponse.data.output || 'No output from webhook.';
                            
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ 
                                message: defaultOutput,
                                _backend: 'Default',
                                _webhook: WEBHOOK_URL
                            }));
                        }
                        break;
                }
            } catch (error) {
                console.error('Chat API error:', error);
                res.writeHead(500);
                res.end(JSON.stringify({ 
                    error: `${BACKEND} backend error`, 
                    details: error.message,
                    _backend: BACKEND
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
    } else if (req.url === '/api/chats' && req.method === 'GET') {
        // List all chat sessions
        try {
            switch (BACKEND) {
                case 'Orch':
                    if (!backendIntegration) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Orchestrator not available' }));
                        return;
                    }
                    
                    const orchStats = orchestrationSetup.orchestrator.getStats();
                    const orchSessions = []; // Orchestrator session management to be implemented
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        sessions: orchSessions,
                        _backend: 'Orch',
                        _orchestrator: 'Enhanced Multi-Agent',
                        _stats: orchStats
                    }));
                    break;
                    
                case 'n8n':
                case 'Generic':
                default:
                    // For non-Orch backends, return empty sessions (they don't maintain server-side session state)
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        sessions: [],
                        _backend: BACKEND,
                        _note: 'Session management only available with Orch backend'
                    }));
                    break;
            }
        } catch (error) {
            console.error('Chat list API error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: 'Failed to retrieve chat sessions',
                details: error.message,
                _backend: BACKEND
            }));
        }
    } else if (req.url.match(/^\/api\/chats\/([^/]+)\/history$/) && req.method === 'GET') {
        // Get session message history
        try {
            const sessionId = req.url.match(/^\/api\/chats\/([^/]+)\/history$/)[1];
            
            switch (BACKEND) {
                case 'Orch':
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        sessionId: sessionId,
                        messages: [],
                        messageCount: 0,
                        _backend: 'Orch',
                        _note: 'Session history integration with orchestrator pending'
                    }));
                    break;
                    
                case 'n8n':
                case 'Generic':
                default:
                    // For non-Orch backends, return empty history
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        sessionId: sessionId,
                        messages: [],
                        messageCount: 0,
                        _backend: BACKEND,
                        _note: 'Message history only available with Orch backend'
                    }));
                    break;
            }
        } catch (error) {
            console.error('Chat history API error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: 'Failed to retrieve chat history',
                details: error.message,
                _backend: BACKEND
            }));
        }
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

// Start the server and log configuration
getIPAddresses().then(ips => {
    server.listen(PORT, () => {
        console.log('=== ChatSG Server Configuration ===');
        console.log(`- Server running at http://localhost:${PORT}/`);
        console.log(`- Backend Mode: ${BACKEND}`);
        console.log(`- Active Backend: ${getBackendMode()}`);
        console.log(`- Legacy Environment: ${ENVIRONMENT}`);
        
        // Backend-specific configuration
        switch (BACKEND) {
            case 'Orch':
                console.log(`- Orchestrator: ${orchestrationSetup ? 'Ready' : 'Failed to initialize'}`);
                if (orchestrationSetup) {
                    const stats = orchestrationSetup.orchestrator.getStats();
                    console.log(`- Registered Agents: ${stats.registeredAgents}`);
                    console.log(`- Available Strategies: ${stats.availableStrategies}`);
                    console.log(`- Environment: ${orchestrationSetup.environment}`);
                }
                if (backendIntegration) {
                    const status = backendIntegration.getStatus();
                    console.log(`- Backend Integration: ${status.initialized ? 'Active' : 'Inactive'}`);
                    console.log(`- Registered Backends: ${status.registeredBackends}`);
                }
                break;
            case 'n8n':
                console.log(`- Webhook URL: ${WEBHOOK_URL}`);
                break;
            case 'Generic':
                console.log(`- Simulation Mode: Active`);
                break;
            default:
                console.log(`- Webhook URL: ${WEBHOOK_URL}`);
                console.log(`- Legacy Mode: ${ENVIRONMENT === 'dev' ? 'Development' : 'Production'}`);
                break;
        }
        
        console.log(`- VNet IP: ${ips.private}`);
        console.log('===================================');
    });
}); 