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
const crypto = require('crypto');

// Import slash commands service
let SlashCommandsRouter, getSlashCommandProcessor;
try {
    SlashCommandsRouter = require('./dist/src/routing/SlashCommandsRouter');
    const slashProcessor = require('./dist/src/routing/SlashCommandProcessor');
    getSlashCommandProcessor = slashProcessor.getSlashCommandProcessor;
    console.log('[Server] Loaded slash commands router and processor');
} catch (error) {
    console.warn('[Server] Could not load slash commands modules:', error.message);
}

// Import orchestrator modules with error handling
let createOrchestrationSetup, createBackendIntegration, OrchestratorAgentFactory, StateManager, createStateContext;

// Import new storage system
let StorageManager, getStorageManager, ContextManager;
try {
    const storage = require('./dist/src/storage');
    StorageManager = storage.StorageManager;
    getStorageManager = storage.getStorageManager;
    ContextManager = storage.ContextManager;
    console.log('[Server] Loaded new storage system');
} catch (error) {
    console.warn('[Server] Could not load storage modules:', error.message);
}

try {
    const routing = require('./dist/src/routing');
    createOrchestrationSetup = routing.createOrchestrationSetup;
    createBackendIntegration = routing.createBackendIntegration;
} catch (error) {
    console.warn('[Server] Could not load routing modules:', error.message);
}

try {
    const agentFactory = require('./dist/src/agents/individual/IndividualAgentFactory');
    OrchestratorAgentFactory = agentFactory.OrchestratorAgentFactory;
} catch (error) {
    console.warn('[Server] Could not load agent factory:', error.message);
}

try {
    const stateManager = require('./dist/src/state/StateManager');
    StateManager = stateManager.StateManager;
} catch (error) {
    console.warn('[Server] Could not load StateManager:', error.message);
}

try {
    const utils = require('./dist/src/state/utils');
    createStateContext = utils.createStateContext;
} catch (error) {
    console.warn('[Server] Could not load utils:', error.message);
}

const PORT = process.env.PORT || 3000;
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:5678/webhook/chat';
const ENVIRONMENT = process.env.ENVIRONMENT || 'production'; // Legacy support
const BACKEND = process.env.BACKEND || 'Orch'; // New backend routing: 'Orch', 'n8n', 'Generic'

// Initialize storage manager
let storageManager = null;
if (getStorageManager) {
    storageManager = getStorageManager();
    storageManager.initialize().then(() => {
        console.log('[Server] Storage manager initialized');
    }).catch(error => {
        console.error('[Server] Failed to initialize storage manager:', error);
    });
}

// Initialize Orchestrator if using Orch backend
let orchestrationSetup = null;
let backendIntegration = null;
if (BACKEND === 'Orch' && createOrchestrationSetup && createBackendIntegration) {
    try {
        orchestrationSetup = createOrchestrationSetup('development');
        backendIntegration = createBackendIntegration(orchestrationSetup.orchestrator, orchestrationSetup.middleware);
        
        // Create and register specialized LLM-powered agents
        let agents = [];
        if (OrchestratorAgentFactory) {
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
        } else {
            console.warn('[Orchestrator] Agent factory not available - running without specialized agents');
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
                
                // Process slash commands - frontend metadata only, normal orchestration as fallback
                let processedMessage = data.message;
                let routingMetadata = null;
                
                // Check if frontend sent slash command metadata
                if (data.slashCommand) {
                    console.log(`[Server] Frontend slash command metadata received:`, data.slashCommand);
                    
                    // Create routing metadata from frontend data
                    routingMetadata = {
                        forceAgent: true,
                        agentType: data.slashCommand.agentType,
                        commandName: data.slashCommand.command,
                        confidence: 1.0,
                        reason: `Frontend slash command: /${data.slashCommand.command}`
                    };
                    
                    // Message should already be clean from frontend
                    processedMessage = data.message;
                    
                    console.log(`[Server] Using frontend slash command: /${data.slashCommand.command} → ${data.slashCommand.agentType}`);
                } else {
                    console.log(`[Server] No slash command metadata, using normal orchestration for: "${data.message}"`);
                }
                
                // Auto-create session if needed and save user message
                if (storageManager && data.message) {
                    try {
                        // Check if session exists, create if not
                        const sessionExists = storageManager.sessionExists(sessionId);
                        
                        if (!sessionExists) {
                            // Auto-create session on first message
                            await storageManager.createSession({
                                sessionId: sessionId,
                                title: data.message.substring(0, 50) + (data.message.length > 50 ? '...' : ''),
                                userId: data.userId
                            });
                            console.log(`[Server] Auto-created session: ${sessionId}`);
                        }
                        
                        // Save user message with slash command metadata
                        const userMessageMetadata = {
                            userId: data.userId
                        };
                        
                        // Add slash command metadata if present
                        if (data.slashCommand && routingMetadata) {
                            // Frontend slash command metadata
                            userMessageMetadata.slashCommand = {
                                command: data.slashCommand.command,
                                agentType: data.slashCommand.agentType
                            };
                            userMessageMetadata.forcedRouting = routingMetadata;
                        }
                        
                        await storageManager.saveMessage({
                            sessionId: sessionId,
                            type: 'user',
                            content: processedMessage, // Use processed message (without slash command)
                            metadata: userMessageMetadata
                        });
                    } catch (storageError) {
                        console.error('[Server] Failed to save user message:', storageError);
                    }
                }
                
                // Route based on BACKEND configuration
                switch (BACKEND) {
                    case 'Orch':
                        // Enhanced Orchestrator mode
                        if (!backendIntegration) {
                            throw new Error('Orchestrator not initialized');
                        }
                        console.log(`[ORCHESTRATOR] Processing with enhanced orchestration: "${processedMessage}"`);
                        
                        // Check if we have forced routing from slash command
                        if (routingMetadata && routingMetadata.forceAgent) {
                            console.log(`[ORCHESTRATOR] Forced routing to ${routingMetadata.agentType} via slash command /${routingMetadata.commandName}`);
                            
                            // Force route directly to specified agent, bypass orchestrator selection
                            const forcedAgentName = routingMetadata.agentType;
                            const availableAgents = orchestrationSetup.orchestrator.listAgents();
                            const targetAgentCapabilities = availableAgents.find(agentCap => 
                                agentCap.name === forcedAgentName || 
                                agentCap.type === forcedAgentName ||
                                agentCap.name.includes(forcedAgentName.replace('Agent', ''))
                            );
                            
                            const targetAgent = targetAgentCapabilities ? 
                                orchestrationSetup.orchestrator.getAgent(targetAgentCapabilities.name) : null;
                            
                            if (targetAgent) {
                                const targetAgentName = targetAgentCapabilities.name;
                                console.log(`[ORCHESTRATOR] Found target agent: ${targetAgentName} for forced routing`);
                                
                                // Create task for forced agent
                                const forcedTask = {
                                    id: `forced-task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                    type: 'chat',
                                    input: processedMessage,
                                    parameters: { sessionId: sessionId },
                                    priority: 1
                                };
                                
                                // Delegate directly to forced agent
                                const forcedResult = await orchestrationSetup.orchestrator.delegateTask(forcedTask, targetAgentName);
                                
                                if (forcedResult.success) {
                                    console.log(`[ORCHESTRATOR] Forced routing successful to ${targetAgentName}`);
                                    
                                    const orchResult = {
                                        success: true,
                                        response: {
                                            message: forcedResult.result?.message || 'Response from forced agent',
                                            _backend: 'orchestrator',
                                            _agent: targetAgentName,
                                            _session: sessionId,
                                            _timestamp: new Date().toISOString(),
                                            _orchestration: {
                                                confidence: 1.0, // Max confidence for forced routing
                                                reason: `Forced routing via slash command: /${routingMetadata.commandName}`,
                                                executionTime: forcedResult.executionTime,
                                                agentLockUsed: false,
                                                forcedBySlashCommand: true
                                            },
                                            success: true
                                        }
                                    };
                                    
                                    // Save forced routing result to storage
                                    if (storageManager && orchResult.response && orchResult.response.message) {
                                        try {
                                            const assistantMetadata = {
                                                agent: orchResult.response._agent || 'orchestrator',
                                                confidence: orchResult.response._orchestration?.confidence,
                                                processingTime: orchResult.response._orchestration?.executionTime,
                                                toolsUsed: orchResult.response._toolsUsed || [],
                                                slashCommandContext: {
                                                    forcedAgent: routingMetadata.forceAgent,
                                                    commandUsed: routingMetadata.commandName,
                                                    wasForced: true
                                                }
                                            };
                                            
                                            await storageManager.saveMessage({
                                                sessionId: sessionId,
                                                type: 'assistant',
                                                content: orchResult.response.message,
                                                metadata: assistantMetadata
                                            });
                                            
                                            if (data.activeSessionId !== sessionId) {
                                                await storageManager.sessionIndex.incrementUnreadCount(sessionId);
                                                console.log(`[Server] Incremented unread count for background session: ${sessionId}`);
                                            } else {
                                                console.log(`[Server] NOT incrementing unread count for active session: ${sessionId}`);
                                            }
                                        } catch (storageError) {
                                            console.error('[Server] Failed to save forced routing message:', storageError);
                                        }
                                    }
                                    
                                    // Add slash command information to response
                                    orchResult.response._slashCommand = {
                                        detected: true,
                                        command: routingMetadata.commandName,
                                        agentType: routingMetadata.agentType,
                                        processedMessage: processedMessage
                                    };
                                    
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify(orchResult.response));
                                    break; // Exit the switch statement
                                } else {
                                    console.warn(`[ORCHESTRATOR] Forced agent task failed: ${forcedResult.error}, falling back to normal orchestration`);
                                    // Fall through to normal orchestration
                                }
                            } else {
                                console.warn(`[ORCHESTRATOR] Forced agent ${forcedAgentName} not found in available agents: [${availableAgents.map(a => a.name).join(', ')}], falling back to normal orchestration`);
                                // Fall through to normal orchestration
                            }
                        }
                        
                        // Normal orchestration (no forced routing or forced routing failed)
                        console.log(`[ORCHESTRATOR] Using normal orchestration for: "${processedMessage}"`);
                        
                        // Use middleware with correct backend parameter
                        const orchResult = await orchestrationSetup.middleware.handleChatRequest(
                            processedMessage, // Use processed message without slash command
                            sessionId,
                            'orchestrator',   // Correct backend string parameter (was broken before)
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
                        
                        // Save assistant response to storage
                        if (storageManager && orchResult.response && orchResult.response.message) {
                            try {
                                const assistantMetadata = {
                                    agent: orchResult.response._agent || 'orchestrator',
                                    confidence: orchResult.response._orchestration?.confidence,
                                    processingTime: orchResult.response._orchestration?.executionTime,
                                    toolsUsed: orchResult.response._toolsUsed || []
                                };
                                
                                // Add slash command context if present
                                if (routingMetadata) {
                                    assistantMetadata.slashCommandContext = {
                                        forcedAgent: routingMetadata.forceAgent,
                                        commandUsed: routingMetadata.commandName,
                                        wasForced: true
                                    };
                                }
                                
                                await storageManager.saveMessage({
                                    sessionId: sessionId,
                                    type: 'assistant',
                                    content: orchResult.response.message,
                                    metadata: assistantMetadata
                                });
                                
                                // Increment unread count only if this is not the active session
                                if (data.activeSessionId !== sessionId) {
                                    await storageManager.sessionIndex.incrementUnreadCount(sessionId);
                                    console.log(`[Server] Incremented unread count for background session: ${sessionId}`);
                                } else {
                                    console.log(`[Server] NOT incrementing unread count for active session: ${sessionId}`);
                                }
                            } catch (storageError) {
                                console.error('[Server] Failed to save assistant message:', storageError);
                            }
                        }
                        
                        // Add slash command information to orchestrator response
                        const orchResponse = { ...orchResult.response };
                        if (routingMetadata) {
                            orchResponse._slashCommand = {
                                detected: true,
                                command: routingMetadata.commandName,
                                agentType: routingMetadata.agentType,
                                processedMessage: processedMessage
                            };
                        }
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(orchResponse));
                        break;
                        
                    case 'n8n':
                        // n8n Webhook mode (Production)
                        console.log(`[N8N] Forwarding to webhook: ${WEBHOOK_URL}`);
                        
                        // Prepare webhook payload with slash command metadata
                        const webhookPayload = { 
                            message: processedMessage,
                            originalMessage: data.message
                        };
                        
                        if (routingMetadata) {
                            webhookPayload.slashCommand = {
                                forceAgent: routingMetadata.forceAgent,
                                agentType: routingMetadata.agentType,
                                commandName: routingMetadata.commandName
                            };
                        }
                        
                        const response = await axios.post(WEBHOOK_URL, webhookPayload);
                        const output = response.data.output || 'No output from webhook.';
                        
                        // Save n8n response to storage
                        if (storageManager) {
                            try {
                                const n8nMetadata = {
                                    agent: 'n8n-webhook',
                                    backend: 'n8n'
                                };
                                
                                // Add slash command context if present
                                if (routingMetadata) {
                                    n8nMetadata.slashCommandContext = {
                                        forcedAgent: routingMetadata.forceAgent,
                                        commandUsed: routingMetadata.commandName,
                                        wasForced: true
                                    };
                                }
                                
                                await storageManager.saveMessage({
                                    sessionId: sessionId,
                                    type: 'assistant',
                                    content: output,
                                    metadata: n8nMetadata
                                });
                                
                                // Increment unread count only if this is not the active session
                                if (data.activeSessionId !== sessionId) {
                                    await storageManager.sessionIndex.incrementUnreadCount(sessionId);
                                    console.log(`[Server] Incremented unread count for background session: ${sessionId}`);
                                } else {
                                    console.log(`[Server] NOT incrementing unread count for active session: ${sessionId}`);
                                }
                            } catch (storageError) {
                                console.error('[Server] Failed to save n8n message:', storageError);
                            }
                        }
                        
                        const n8nResponse = { 
                            message: output,
                            _backend: 'n8n',
                            _webhook: WEBHOOK_URL
                        };
                        
                        // Add slash command information to n8n response
                        if (routingMetadata) {
                            n8nResponse._slashCommand = {
                                detected: true,
                                command: routingMetadata.commandName,
                                agentType: routingMetadata.agentType,
                                processedMessage: processedMessage
                            };
                        }
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(n8nResponse));
                        break;
                        
                    case 'Generic':
                        // Generic simulation mode (Development)
                        console.log(`[GENERIC] Simulating response for message: "${processedMessage}"`);
                        
                        // Simulate some processing delay (like a real API call)
                        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
                        
                        // Use processed message for simulation but include routing info
                        let simulatedResponse = getSimulatedN8nResponse(processedMessage);
                        
                        // Add slash command acknowledgment if present
                        if (routingMetadata) {
                            simulatedResponse = `[${routingMetadata.agentType} Agent] ${simulatedResponse}`;
                        }
                        
                        // Save simulated response to storage
                        if (storageManager) {
                            try {
                                const genericMetadata = {
                                    agent: 'generic-simulator',
                                    backend: 'Generic',
                                    simulation: true
                                };
                                
                                // Add slash command context if present
                                if (routingMetadata) {
                                    genericMetadata.slashCommandContext = {
                                        forcedAgent: routingMetadata.forceAgent,
                                        commandUsed: routingMetadata.commandName,
                                        wasForced: true
                                    };
                                }
                                
                                await storageManager.saveMessage({
                                    sessionId: sessionId,
                                    type: 'assistant',
                                    content: simulatedResponse,
                                    metadata: genericMetadata
                                });
                                
                                // Increment unread count only if this is not the active session
                                if (data.activeSessionId !== sessionId) {
                                    await storageManager.sessionIndex.incrementUnreadCount(sessionId);
                                    console.log(`[Server] Incremented unread count for background session: ${sessionId}`);
                                } else {
                                    console.log(`[Server] NOT incrementing unread count for active session: ${sessionId}`);
                                }
                            } catch (storageError) {
                                console.error('[Server] Failed to save generic message:', storageError);
                            }
                        }
                        
                        const genericResponse = { 
                            message: simulatedResponse,
                            _backend: 'Generic',
                            _simulation: true,
                            _original_message: data.message
                        };
                        
                        // Add slash command information to response
                        if (routingMetadata) {
                            genericResponse._slashCommand = {
                                detected: true,
                                command: routingMetadata.commandName,
                                agentType: routingMetadata.agentType,
                                processedMessage: processedMessage
                            };
                        }
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(genericResponse));
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
            // Use new storage manager if available
            if (storageManager) {
                const sessions = storageManager.listSessions({
                    status: ['active', 'inactive'],
                    sortBy: 'lastActivityAt',
                    sortOrder: 'desc'
                });
                
                // Convert to frontend format
                const formattedSessions = sessions.map(session => ({
                    id: session.sessionId || session.file?.replace('session_', '').replace('.jsonl', ''),
                    title: session.title,
                    createdAt: session.createdAt,
                    lastMessageAt: session.lastActivityAt,
                    messageCount: session.messageCount,
                    status: session.status,
                    agentType: session.metadata?.lastAgent
                }));
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    chats: formattedSessions,
                    totalChats: formattedSessions.length,
                    _backend: BACKEND,
                    _storage: 'new'
                }));
                return;
            }
            
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
    } else if (req.url === '/api/slash-commands' && req.method === 'GET') {
        // Slash Commands API - Get all available commands
        try {
            if (!SlashCommandsRouter) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false,
                    error: 'Slash commands service not available',
                    code: 'SERVICE_UNAVAILABLE'
                }));
                return;
            }
            
            const { getSlashCommandService } = require('./dist/src/routing/SlashCommandService');
            const service = getSlashCommandService();
            
            // Ensure configuration is loaded
            const loaded = await service.loadConfiguration();
            if (!loaded) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: 'Failed to load slash commands configuration',
                    code: 'CONFIG_LOAD_ERROR'
                }));
                return;
            }

            // Get commands and metadata
            const commands = service.getCommands();
            const metadata = service.getMetadata();

            const response = {
                success: true,
                commands,
                metadata: {
                    ...metadata,
                    serverTimestamp: new Date().toISOString()
                }
            };

            // Set caching headers for performance
            res.writeHead(200, { 
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300', // 5 minutes cache
                'ETag': `"${metadata.version}-${metadata.commandCount}"`
            });
            res.end(JSON.stringify(response));
            
            console.log(`[SlashCommands] Served ${commands.length} commands to client`);

        } catch (error) {
            console.error('[SlashCommands] Error serving commands:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Internal server error while fetching commands',
                code: 'INTERNAL_ERROR'
            }));
        }
    } else if (req.url.match(/^\/api\/slash-commands\/validate\/([^/]+)$/) && req.method === 'GET') {
        // Slash Commands API - Validate a specific command
        try {
            const command = req.url.match(/^\/api\/slash-commands\/validate\/([^/]+)$/)[1];
            
            if (!SlashCommandsRouter) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false,
                    error: 'Slash commands service not available',
                    code: 'SERVICE_UNAVAILABLE'
                }));
                return;
            }
            
            const { getSlashCommandService } = require('./dist/src/routing/SlashCommandService');
            const service = getSlashCommandService();
            
            // Ensure configuration is loaded
            const loaded = await service.loadConfiguration();
            if (!loaded) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: 'Failed to load slash commands configuration',
                    code: 'CONFIG_LOAD_ERROR'
                }));
                return;
            }

            // Remove leading slash if present and decode URL
            const cleanCommand = decodeURIComponent(command.startsWith('/') ? command.slice(1) : command);
            
            // Validate command name format
            const isValidFormat = service.validateCommandName(cleanCommand);
            if (!isValidFormat) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    valid: false,
                    error: 'Invalid command format. Commands must contain only letters, numbers, hyphens, and underscores.',
                    suggestions: []
                }));
                return;
            }

            // Resolve command
            const result = service.resolveCommand(cleanCommand);
            
            const response = {
                success: true,
                valid: result.success,
                command: result.command,
                error: result.error,
                suggestions: result.suggestions || []
            };

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response));
            
            console.log(`[SlashCommands] Validated command: ${cleanCommand} → ${result.success ? 'valid' : 'invalid'}`);

        } catch (error) {
            console.error('[SlashCommands] Error validating command:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Internal server error while validating command',
                code: 'INTERNAL_ERROR'
            }));
        }
    } else if (req.url === '/api/slash-commands/health' && req.method === 'GET') {
        // Slash Commands API - Health check
        try {
            if (!SlashCommandsRouter) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    status: 'unavailable',
                    configLoaded: false,
                    timestamp: new Date().toISOString()
                }));
                return;
            }
            
            const { getSlashCommandService } = require('./dist/src/routing/SlashCommandService');
            const service = getSlashCommandService();
            const loaded = await service.loadConfiguration();
            
            const health = {
                success: true,
                status: loaded ? 'healthy' : 'degraded',
                configLoaded: loaded,
                timestamp: new Date().toISOString()
            };

            if (loaded) {
                const metadata = service.getMetadata();
                health['commandCount'] = metadata.commandCount;
                health['version'] = metadata.version;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(health));

        } catch (error) {
            console.error('[SlashCommands] Health check failed:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            }));
        }
    } else if (req.url.match(/^\/api\/chats\/([^/]+)\/history$/) && req.method === 'GET') {
        // Get session message history
        try {
            const sessionId = req.url.match(/^\/api\/chats\/([^/]+)\/history$/)[1];
            
            // Use new storage manager if available (preferred)
            if (storageManager) {
                const messages = await storageManager.getMessages(sessionId);
                
                // Convert to frontend format
                const formattedMessages = messages.map((msg, index) => ({
                    id: index,
                    content: msg.content,
                    type: msg.type,
                    timestamp: msg.timestamp,
                    agent: msg.metadata?.agent,
                    sender: msg.type === 'user' ? 'user' : 'bot'
                }));
                
                const sessionInfo = storageManager.sessionIndex.getSession(sessionId);
                const totalCount = sessionInfo ? sessionInfo.messageCount : messages.length;
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    sessionId: sessionId,
                    messages: formattedMessages,
                    messageCount: totalCount,
                    agentHistory: [], // Would need to fetch from state manager if needed
                    toolsUsed: [], // Would need to fetch from tool logger if needed
                    analytics: {},
                    _backend: BACKEND,
                    _storage: 'jsonl'
                }));
                return;
            }
            
            // Fallback to StateManager for backward compatibility
            switch (BACKEND) {
                case 'Orch':
                    if (!backendIntegration) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Orchestrator not available' }));
                        return;
                    }
                    
                    try {
                        const stateManager = StateManager.getInstance();
                        const context = createStateContext(sessionId, 'system', 'default');
                        const sessionResult = await stateManager.getSessionState(sessionId, context);
                        
                        if (sessionResult.success && sessionResult.data) {
                            const session = sessionResult.data;
                            const messages = [];
                            
                            // Extract message history from the session
                            if (session.messageHistory) {
                                // Convert message history to a readable format
                                const chatHistory = session.messageHistory;
                                if (chatHistory.messages) {
                                    chatHistory.messages.forEach((msg, index) => {
                                        messages.push({
                                            id: index,
                                            content: msg.content,
                                            type: msg._getType(),
                                            timestamp: new Date().toISOString(), // Approximate timestamp
                                            agent: session.agentHistory?.find(a => 
                                                Math.abs(new Date(a.timestamp).getTime() - Date.now()) < 60000
                                            )?.agentName || session.metadata.agent
                                        });
                                    });
                                }
                            }
                            
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                sessionId: sessionId,
                                messages: messages,
                                messageCount: messages.length,
                                agentHistory: session.agentHistory || [],
                                toolsUsed: session.toolsUsed || [],
                                analytics: session.analytics || {},
                                _backend: 'Orch'
                            }));
                        } else {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                sessionId: sessionId,
                                messages: [],
                                messageCount: 0,
                                agentHistory: [],
                                toolsUsed: [],
                                analytics: {},
                                _backend: 'Orch'
                            }));
                        }
                    } catch (error) {
                        console.error('StateManager error:', error);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            sessionId: sessionId,
                            messages: [],
                            messageCount: 0,
                            _backend: 'Orch',
                            _note: 'Session history integration with orchestrator pending'
                        }));
                    }
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
    } else if (req.url.match(/^\/api\/chats\/([^/]+)\/settings$/) && req.method === 'GET') {
        // Get chat settings
        try {
            const sessionId = req.url.match(/^\/api\/chats\/([^/]+)\/settings$/)[1];
            
            switch (BACKEND) {
                case 'Orch':
                    if (!backendIntegration) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Orchestrator not available' }));
                        return;
                    }
                    
                    try {
                        const stateManager = StateManager.getInstance();
                        const context = createStateContext(sessionId, 'system', 'default');
                        const sessionResult = await stateManager.getSessionState(sessionId, context);
                        
                        if (sessionResult.success && sessionResult.data) {
                            const session = sessionResult.data;
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                sessionId: sessionId,
                                settings: session.userPreferences || {
                                    crossSessionMemory: false,
                                    agentLock: false
                                },
                                metadata: session.metadata,
                                _backend: 'Orch'
                            }));
                        } else {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                sessionId: sessionId,
                                settings: {
                                    crossSessionMemory: false,
                                    agentLock: false
                                },
                                metadata: {},
                                _backend: 'Orch'
                            }));
                        }
                    } catch (error) {
                        console.error('StateManager error:', error);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            error: 'Failed to retrieve chat settings',
                            details: error.message,
                            _backend: BACKEND
                        }));
                    }
                    break;
                    
                default:
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        sessionId: sessionId,
                        settings: {
                            crossSessionMemory: false,
                            agentLock: false
                        },
                        _backend: BACKEND,
                        _note: 'Settings management only available with Orch backend'
                    }));
                    break;
            }
        } catch (error) {
            console.error('Chat settings API error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: 'Failed to retrieve chat settings',
                details: error.message,
                _backend: BACKEND
            }));
        }
    } else if (req.url.match(/^\/api\/chats\/([^/]+)\/settings$/) && req.method === 'POST') {
        // Update chat settings
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const sessionId = req.url.match(/^\/api\/chats\/([^/]+)\/settings$/)[1];
                const data = JSON.parse(body);
                
                switch (BACKEND) {
                    case 'Orch':
                        if (!backendIntegration) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Orchestrator not available' }));
                            return;
                        }
                        
                        try {
                            const stateManager = StateManager.getInstance();
                            const context = createStateContext(sessionId, 'system', 'default');
                            
                            // Get current session state
                            const sessionResult = await stateManager.getSessionState(sessionId, context);
                            if (!sessionResult.success) {
                                res.writeHead(404, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ 
                                    error: 'Session not found',
                                    sessionId: sessionId
                                }));
                                return;
                            }
                            
                            // Update user preferences
                            const updatedPreferences = {
                                ...sessionResult.data.userPreferences,
                                ...data.settings,
                                lastUpdated: new Date()
                            };
                            
                            if (data.settings.agentLock === true) {
                                updatedPreferences.agentLockTimestamp = new Date();
                            }
                            
                            // Update session state
                            const updateResult = await stateManager.updateSessionState(
                                sessionId,
                                { userPreferences: updatedPreferences },
                                context
                            );
                            
                            if (updateResult.success) {
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({
                                    sessionId: sessionId,
                                    settings: updatedPreferences,
                                    success: true,
                                    _backend: 'Orch'
                                }));
                            } else {
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({
                                    error: 'Failed to update settings',
                                    details: updateResult.error
                                }));
                            }
                        } catch (error) {
                            console.error('StateManager error:', error);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ 
                                error: 'Failed to update chat settings',
                                details: error.message,
                                _backend: BACKEND
                            }));
                        }
                        break;
                        
                    default:
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            sessionId: sessionId,
                            settings: data.settings,
                            success: true,
                            _backend: BACKEND,
                            _note: 'Settings changes not persisted - only available with Orch backend'
                        }));
                        break;
                }
            } catch (error) {
                console.error('Chat settings update error:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: 'Invalid request data',
                    details: error.message
                }));
            }
        });
    } else if (req.url.match(/^\/api\/chats\/([^/]+)\/agents$/) && req.method === 'GET') {
        // Get agent history for chat
        try {
            const sessionId = req.url.match(/^\/api\/chats\/([^/]+)\/agents$/)[1];
            
            switch (BACKEND) {
                case 'Orch':
                    if (!backendIntegration) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Orchestrator not available' }));
                        return;
                    }
                    
                    try {
                        const stateManager = StateManager.getInstance();
                        const context = createStateContext(sessionId, 'system', 'default');
                        const sessionResult = await stateManager.getSessionState(sessionId, context);
                        
                        if (sessionResult.success && sessionResult.data) {
                            const session = sessionResult.data;
                            const agentHistory = session.agentHistory || [];
                            const toolsUsed = session.toolsUsed || [];
                            
                            // Get agent statistics
                            const agentStats = {};
                            agentHistory.forEach(interaction => {
                                if (!agentStats[interaction.agentName]) {
                                    agentStats[interaction.agentName] = {
                                        name: interaction.agentName,
                                        totalInteractions: 0,
                                        averageConfidence: 0,
                                        lastUsed: interaction.timestamp,
                                        handoffs: { from: 0, to: 0 }
                                    };
                                }
                                agentStats[interaction.agentName].totalInteractions++;
                                agentStats[interaction.agentName].averageConfidence = 
                                    (agentStats[interaction.agentName].averageConfidence + interaction.confidence) / 
                                    agentStats[interaction.agentName].totalInteractions;
                                
                                if (new Date(interaction.timestamp) > new Date(agentStats[interaction.agentName].lastUsed)) {
                                    agentStats[interaction.agentName].lastUsed = interaction.timestamp;
                                }
                                
                                if (interaction.handoffFrom) {
                                    agentStats[interaction.agentName].handoffs.from++;
                                }
                            });
                            
                            // Count handoffs to each agent
                            agentHistory.forEach(interaction => {
                                if (interaction.handoffFrom && agentStats[interaction.handoffFrom]) {
                                    agentStats[interaction.handoffFrom].handoffs.to++;
                                }
                            });
                            
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                sessionId: sessionId,
                                agentHistory: agentHistory,
                                agentStats: Object.values(agentStats),
                                toolsUsed: toolsUsed,
                                currentAgent: session.metadata.agent,
                                _backend: 'Orch'
                            }));
                        } else {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                sessionId: sessionId,
                                agentHistory: [],
                                agentStats: [],
                                toolsUsed: [],
                                currentAgent: null,
                                _backend: 'Orch'
                            }));
                        }
                    } catch (error) {
                        console.error('StateManager error:', error);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            error: 'Failed to retrieve agent history',
                            details: error.message,
                            _backend: BACKEND
                        }));
                    }
                    break;
                    
                default:
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        sessionId: sessionId,
                        agentHistory: [],
                        agentStats: [],
                        toolsUsed: [],
                        currentAgent: null,
                        _backend: BACKEND,
                        _note: 'Agent history only available with Orch backend'
                    }));
                    break;
            }
        } catch (error) {
            console.error('Agent history API error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: 'Failed to retrieve agent history',
                details: error.message,
                _backend: BACKEND
            }));
        }
    } else if (req.url === '/api/memory/cross-session' && req.method === 'POST') {
        // Manage cross-session memory access
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const { action, sessionId, targetSessionId, userId } = data;
                
                switch (BACKEND) {
                    case 'Orch':
                        if (!backendIntegration) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Orchestrator not available' }));
                            return;
                        }
                        
                        try {
                            const stateManager = StateManager.getInstance();
                            const context = createStateContext(sessionId, 'system', userId || 'default');
                            
                            switch (action) {
                                case 'get':
                                    // Get cross-session memory for user
                                    const userMemoryKey = `user:${userId || 'default'}:cross-session-memory`;
                                    const memoryResult = await stateManager.getSharedState(userMemoryKey, context);
                                    
                                    if (memoryResult.success && memoryResult.data) {
                                        res.writeHead(200, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify({
                                            success: true,
                                            action: 'get',
                                            memory: memoryResult.data.data,
                                            sessions: memoryResult.data.data.sessions || [],
                                            _backend: 'Orch'
                                        }));
                                    } else {
                                        res.writeHead(200, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify({
                                            success: true,
                                            action: 'get',
                                            memory: { sessions: [] },
                                            sessions: [],
                                            _backend: 'Orch'
                                        }));
                                    }
                                    break;
                                    
                                case 'share':
                                    // Share current session memory across sessions
                                    const sourceSession = await stateManager.getSessionState(sessionId, context);
                                    if (!sourceSession.success) {
                                        res.writeHead(404, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify({ 
                                            error: 'Source session not found',
                                            sessionId: sessionId
                                        }));
                                        return;
                                    }
                                    
                                    // Get or create cross-session memory
                                    const memoryKey = `user:${userId || 'default'}:cross-session-memory`;
                                    const existingMemory = await stateManager.getSharedState(memoryKey, context);
                                    
                                    const crossSessionData = {
                                        sessions: existingMemory.success ? 
                                            (existingMemory.data.data.sessions || []) : [],
                                        lastUpdated: new Date()
                                    };
                                    
                                    // Add current session summary
                                    const sessionSummary = {
                                        sessionId: sessionId,
                                        agentHistory: sourceSession.data.agentHistory || [],
                                        keyToolsUsed: (sourceSession.data.toolsUsed || [])
                                            .filter(tool => tool.success)
                                            .slice(-10), // Last 10 successful tools
                                        preferences: sourceSession.data.userPreferences || {},
                                        analytics: sourceSession.data.analytics || {},
                                        sharedAt: new Date()
                                    };
                                    
                                    // Update or add session
                                    const existingIndex = crossSessionData.sessions
                                        .findIndex(s => s.sessionId === sessionId);
                                    if (existingIndex >= 0) {
                                        crossSessionData.sessions[existingIndex] = sessionSummary;
                                    } else {
                                        crossSessionData.sessions.push(sessionSummary);
                                    }
                                    
                                    // Limit to last 20 sessions
                                    if (crossSessionData.sessions.length > 20) {
                                        crossSessionData.sessions = crossSessionData.sessions.slice(-20);
                                    }
                                    
                                    // Store updated memory
                                    const storeResult = await stateManager.setSharedState(
                                        memoryKey,
                                        crossSessionData,
                                        {
                                            scope: 'user',
                                            permissions: {
                                                read: [userId || 'default'],
                                                write: [userId || 'default'],
                                                delete: [userId || 'default']
                                            }
                                        },
                                        context
                                    );
                                    
                                    if (storeResult.success) {
                                        res.writeHead(200, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify({
                                            success: true,
                                            action: 'share',
                                            sessionId: sessionId,
                                            sharedSessions: crossSessionData.sessions.length,
                                            _backend: 'Orch'
                                        }));
                                    } else {
                                        res.writeHead(500, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify({
                                            error: 'Failed to store cross-session memory',
                                            details: storeResult.error
                                        }));
                                    }
                                    break;
                                    
                                case 'load':
                                    // Load memory from target session
                                    if (!targetSessionId) {
                                        res.writeHead(400, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify({ 
                                            error: 'targetSessionId required for load action'
                                        }));
                                        return;
                                    }
                                    
                                    const targetContext = createStateContext(targetSessionId, 'system', userId || 'default');
                                    const targetSession = await stateManager.getSessionState(targetSessionId, targetContext);
                                    
                                    if (targetSession.success) {
                                        res.writeHead(200, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify({
                                            success: true,
                                            action: 'load',
                                            sourceSessionId: targetSessionId,
                                            targetSessionId: sessionId,
                                            memory: {
                                                agentHistory: targetSession.data.agentHistory || [],
                                                preferences: targetSession.data.userPreferences || {},
                                                analytics: targetSession.data.analytics || {}
                                            },
                                            _backend: 'Orch'
                                        }));
                                    } else {
                                        res.writeHead(404, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify({ 
                                            error: 'Target session not found',
                                            targetSessionId: targetSessionId
                                        }));
                                    }
                                    break;
                                    
                                default:
                                    res.writeHead(400, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ 
                                        error: 'Invalid action. Supported: get, share, load',
                                        action: action
                                    }));
                                    break;
                            }
                        } catch (error) {
                            console.error('Cross-session memory error:', error);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ 
                                error: 'Failed to manage cross-session memory',
                                details: error.message,
                                _backend: BACKEND
                            }));
                        }
                        break;
                        
                    default:
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            success: true,
                            action: action,
                            _backend: BACKEND,
                            _note: 'Cross-session memory not persisted - only available with Orch backend'
                        }));
                        break;
                }
            } catch (error) {
                console.error('Cross-session memory API error:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: 'Invalid request data',
                    details: error.message
                }));
            }
        });
    } else if (req.url === '/api/chats' && req.method === 'GET') {
        // Get all chats with metadata
        try {
            // Use new storage manager if available
            if (storageManager) {
                const sessions = storageManager.sessionIndex.listSessions({
                    status: 'active',
                    sortBy: 'lastActivityAt',
                    sortOrder: 'desc'
                });
                
                // Format sessions for frontend with unread counts
                const formattedSessions = sessions.map(session => {
                    console.log(`[Server] Formatting session ${session.sessionId}: unreadCount=${session.metadata.unreadCount}, lastReadAt=${session.metadata.lastReadAt}`);
                    return {
                        id: session.sessionId || session.file.replace('session_', '').replace('.jsonl', ''),
                        name: session.title,
                        lastMessage: `${session.messageCount} messages`,
                        timestamp: session.lastActivityAt,
                        hasNewMessages: (session.metadata.unreadCount || 0) > 0,
                        unreadCount: session.metadata.unreadCount || 0,
                        lastReadAt: session.metadata.lastReadAt || null,
                        metadata: {
                            messageCount: session.messageCount,
                            createdAt: session.createdAt,
                            lastAgent: session.metadata.lastAgent
                        }
                    };
                });
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    chats: formattedSessions,
                    totalChats: formattedSessions.length,
                    _backend: BACKEND,
                    _storage: 'jsonl'
                }));
                return;
            }
            
            switch (BACKEND) {
                case 'Orch':
                    if (!backendIntegration) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Orchestrator not available' }));
                        return;
                    }
                    
                    const stateManager = StateManager.getInstance();
                    const context = createStateContext('system', 'system', 'default');
                    
                    // Get all sessions (this is a simplified approach - in production you'd want pagination)
                    const allSessions = [];
                    
                    // For now, return empty array as we need a proper session listing mechanism
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        chats: allSessions,
                        totalChats: 0,
                        _backend: 'Orch'
                    }));
                    break;
                    
                default:
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        chats: [],
                        totalChats: 0,
                        _backend: BACKEND,
                        _note: 'Chat listing not available - only with Orch backend'
                    }));
                    break;
            }
        } catch (error) {
            console.error('Chat list error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: 'Failed to get chat list',
                details: error.message
            }));
        }
    } else if (req.url.match(/^\/api\/chats\/([^/]+)$/) && req.method === 'DELETE') {
        // Delete chat
        try {
            const chatId = req.url.match(/^\/api\/chats\/([^/]+)$/)[1];
            
            // Use new storage manager if available
            if (storageManager) {
                await storageManager.deleteSession(chatId);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    chatId: chatId,
                    _backend: BACKEND,
                    _storage: 'new'
                }));
                return;
            }
            
            switch (BACKEND) {
                case 'Orch':
                    if (!backendIntegration) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Orchestrator not available' }));
                        return;
                    }
                    
                    // For now, just return success as we need proper deletion mechanism
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        chatId: chatId,
                        _backend: 'Orch'
                    }));
                    break;
                    
                default:
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true,
                        chatId: chatId,
                        _backend: BACKEND,
                        _note: 'Chat not actually deleted - only with Orch backend'
                    }));
                    break;
            }
        } catch (error) {
            console.error('Delete chat error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: 'Failed to delete chat',
                details: error.message
            }));
        }
    } else if (req.url.match(/^\/api\/chats\/([^/]+)\/read$/) && req.method === 'PATCH') {
        // Mark chat as read
        try {
            const sessionId = req.url.match(/^\/api\/chats\/([^/]+)\/read$/)[1];
            
            // Use new storage manager if available
            if (storageManager) {
                await storageManager.sessionIndex.markSessionAsRead(sessionId);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    sessionId: sessionId,
                    unreadCount: 0,
                    lastReadAt: new Date().toISOString(),
                    _backend: BACKEND,
                    _storage: 'jsonl'
                }));
                return;
            }
            
            // Fallback response if no storage manager
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Storage manager not available',
                _backend: BACKEND
            }));
        } catch (error) {
            console.error('Mark as read error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: 'Failed to mark session as read',
                details: error.message
            }));
        }
    } else if (req.url.match(/^\/api\/chats\/([^/]+)\/messages/) && req.method === 'GET') {
        // Get chat messages with pagination
        console.log(`[Server] Messages endpoint hit: ${req.url}`);
        try {
            const match = req.url.match(/^\/api\/chats\/([^/]+)\/messages/);
            if (!match) {
                console.error('[Server] URL match failed for:', req.url);
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid URL format' }));
                return;
            }
            const sessionId = match[1];
            const urlParams = new URL(req.url, `http://localhost:${PORT}`).searchParams;
            const limit = parseInt(urlParams.get('limit') || '50');
            const offset = parseInt(urlParams.get('offset') || '0');
            
            console.log(`[Server] Loading messages for session: ${sessionId}, offset: ${offset}, limit: ${limit}`);
            
            // Use new storage manager if available
            if (storageManager) {
                const messages = await storageManager.getMessages(sessionId, {
                    limit: limit,
                    offset: offset
                });
                
                // Convert to frontend format
                const formattedMessages = messages.map((msg, index) => ({
                    id: offset + index,
                    content: msg.content,
                    type: msg.type,
                    timestamp: msg.timestamp,
                    agent: msg.metadata?.agent,
                    sender: msg.type === 'user' ? 'user' : 'bot'
                }));
                
                const sessionInfo = storageManager.sessionIndex.getSession(sessionId);
                const totalCount = sessionInfo ? sessionInfo.messageCount : messages.length;
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    sessionId: sessionId,
                    messages: formattedMessages,
                    totalMessages: totalCount,
                    hasMore: (offset + limit) < totalCount,
                    _backend: BACKEND,
                    _storage: 'new'
                }));
                return;
            }
            
            switch (BACKEND) {
                case 'Orch':
                    if (!backendIntegration) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Orchestrator not available' }));
                        return;
                    }
                    
                    const stateManager = StateManager.getInstance();
                    const context = createStateContext(sessionId, 'system', 'default');
                    const sessionResult = await stateManager.getSessionState(sessionId, context);
                    
                    if (sessionResult.success && sessionResult.data) {
                        const session = sessionResult.data;
                        const messages = [];
                        
                        // Extract messages from message history
                        if (session.messageHistory && session.messageHistory.messages) {
                            session.messageHistory.messages.forEach((msg, index) => {
                                messages.push({
                                    id: index,
                                    content: msg.content,
                                    type: msg._getType(),
                                    timestamp: new Date().toISOString(),
                                    agent: session.metadata?.agent
                                });
                            });
                        }
                        
                        // Apply pagination
                        const paginatedMessages = messages.slice(offset, offset + limit);
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            sessionId: sessionId,
                            messages: paginatedMessages,
                            totalMessages: messages.length,
                            hasMore: (offset + limit) < messages.length,
                            _backend: 'Orch'
                        }));
                    } else {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            sessionId: sessionId,
                            messages: [],
                            totalMessages: 0,
                            hasMore: false,
                            _backend: 'Orch'
                        }));
                    }
                    break;
                    
                default:
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        sessionId: sessionId,
                        messages: [],
                        totalMessages: 0,
                        hasMore: false,
                        _backend: BACKEND,
                        _note: 'Message storage not available - only with Orch backend'
                    }));
                    break;
            }
        } catch (error) {
            console.error('Get messages error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: 'Failed to get messages',
                details: error.message
            }));
        }
    } else if (req.url === '/api/chats' && req.method === 'POST') {
        // Create new chat session
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                
                // Generate unique session ID if not provided
                const sessionId = data.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                // Use new storage manager if available
                if (storageManager) {
                    const sessionData = {
                        sessionId: sessionId,
                        title: data.title || 'New Chat',
                        userId: data.userId || 'default',
                        metadata: data.metadata || {}
                    };
                    
                    await storageManager.createSession(sessionData);
                    
                    // Get the created session details from the index
                    const sessionInfo = storageManager.sessionIndex.getSession(sessionId);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        sessionId: sessionId,
                        session: {
                            id: sessionId,
                            title: sessionInfo.title,
                            createdAt: sessionInfo.createdAt,
                            status: sessionInfo.status,
                            messageCount: 0
                        },
                        _backend: BACKEND,
                        _storage: 'new'
                    }));
                    return;
                }
                
                // Fallback for non-storage manager mode
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    sessionId: sessionId,
                    session: {
                        id: sessionId,
                        title: data.title || 'New Chat',
                        createdAt: new Date().toISOString(),
                        status: 'active',
                        messageCount: 0
                    },
                    _backend: BACKEND,
                    _note: 'Session created in memory only - storage manager not available'
                }));
                
            } catch (error) {
                console.error('Create chat error:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: 'Failed to create chat session',
                    details: error.message
                }));
            }
        });
    } else if (req.url.match(/^\/api\/chats\/([^/]+)\/messages$/) && req.method === 'POST') {
        // Save messages from frontend (batch operation)
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const sessionId = req.url.match(/^\/api\/chats\/([^/]+)\/messages$/)[1];
                const data = JSON.parse(body);
                
                // Validate input
                if (!data.messages || !Array.isArray(data.messages)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        error: 'Invalid request',
                        details: 'messages array is required'
                    }));
                    return;
                }
                
                // Use new storage manager if available
                if (storageManager) {
                    // Check if session exists
                    if (!storageManager.sessionIndex.sessionExists(sessionId)) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            error: 'Session not found',
                            sessionId: sessionId
                        }));
                        return;
                    }
                    
                    // Save messages in batch
                    let savedCount = 0;
                    for (const message of data.messages) {
                        try {
                            await storageManager.saveMessage({
                                sessionId: sessionId,
                                type: message.type || 'user',
                                content: message.content,
                                metadata: message.metadata || {}
                            });
                            savedCount++;
                        } catch (err) {
                            console.error(`Failed to save message: ${err.message}`);
                        }
                    }
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        sessionId: sessionId,
                        savedMessages: savedCount,
                        totalMessages: data.messages.length,
                        _backend: BACKEND,
                        _storage: 'new'
                    }));
                    return;
                }
                
                // Fallback for non-storage manager mode
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    sessionId: sessionId,
                    savedMessages: data.messages.length,
                    totalMessages: data.messages.length,
                    _backend: BACKEND,
                    _note: 'Messages not persisted - storage manager not available'
                }));
                
            } catch (error) {
                console.error('Save messages error:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: 'Failed to save messages',
                    details: error.message
                }));
            }
        });
    } else if (req.url.match(/^\/api\/debug\/cross-session\/([^/]+)$/) && req.method === 'GET') {
        // Debug endpoint for cross-session context
        const sessionId = req.url.match(/^\/api\/debug\/cross-session\/([^/]+)$/)[1];
        
        try {
            if (!storageManager) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Storage manager not available' }));
                return;
            }
            
            // Get session info to find user ID
            const sessions = storageManager.listSessions();
            const sessionInfo = sessions.find(s => s.sessionId === sessionId);
            
            if (!sessionInfo) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: 'Session not found',
                    sessionId: sessionId
                }));
                return;
            }
            
            const userId = sessionInfo.metadata?.userId;
            
            // Check if cross-session memory is enabled
            const stateManager = StateManager.getInstance();
            const context = createStateContext(sessionId, 'debug', userId);
            const sessionState = await stateManager.getSessionState(sessionId, context);
            
            const crossSessionEnabled = sessionState.success && 
                sessionState.data?.userPreferences?.crossSessionMemory;
            
            // Get cross-session context
            const crossSessionData = await storageManager.getCrossSessionContext(
                sessionId,
                userId
            );
            
            // Format the response to show what would be injected
            const storageConfig = require('./dist/config/storage.config');
            const config = storageConfig.STORAGE_CONFIG.crossSession.contextInjectionFormat;
            let contextPreview = '';
            
            if (crossSessionData.sessions.length > 0) {
                contextPreview = `${config.header}\n\n`;
                
                for (const session of crossSessionData.sessions) {
                    const sessionHeader = config.sessionFormat
                        .replace('{title}', session.title)
                        .replace('{lastActive}', new Date(session.lastActive).toLocaleString());
                    
                    contextPreview += `${sessionHeader}\n`;
                    
                    // Add message preview
                    for (const msg of session.messages.slice(-3)) { // Last 3 messages
                        const role = msg.type === 'user' ? 'User' : 'Assistant';
                        const preview = msg.content.substring(0, 100);
                        contextPreview += `${role}: ${preview}${msg.content.length > 100 ? '...' : ''}\n`;
                    }
                    
                    contextPreview += config.sessionSeparator;
                }
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                sessionId: sessionId,
                userId: userId,
                crossSessionEnabled: crossSessionEnabled,
                crossSessionConfig: {
                    maxMessages: storageConfig.STORAGE_CONFIG.crossSession.maxCrossSessionMessages,
                    maxSessions: storageConfig.STORAGE_CONFIG.crossSession.maxActiveSessions,
                    activeWindow: storageConfig.STORAGE_CONFIG.crossSession.activeSessionWindow
                },
                foundSessions: crossSessionData.sessions.length,
                totalMessages: crossSessionData.totalMessages,
                sessions: crossSessionData.sessions.map(s => ({
                    sessionId: s.sessionId,
                    title: s.title,
                    lastActive: s.lastActive,
                    messageCount: s.messages.length
                })),
                contextPreview: contextPreview || 'No cross-session context available',
                _note: 'This is what would be injected into the LLM prompt when cross-session memory is enabled'
            }));
            
        } catch (error) {
            console.error('Debug cross-session error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: 'Failed to get cross-session debug info',
                details: error.message
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

// Graceful shutdown handler
process.on('SIGINT', async () => {
    console.log('\n[Server] Shutting down gracefully...');
    
    // Close storage manager if available
    if (storageManager) {
        await storageManager.shutdown();
    }
    
    // Close server
    server.close(() => {
        console.log('[Server] Server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', async () => {
    console.log('\n[Server] Shutting down gracefully...');
    
    // Close storage manager if available
    if (storageManager) {
        await storageManager.shutdown();
    }
    
    // Close server
    server.close(() => {
        console.log('[Server] Server closed');
        process.exit(0);
    });
}); 