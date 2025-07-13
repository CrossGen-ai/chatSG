const path = require('path');
const fs = require('fs');

// Load environment variables (dotenv will look for .env in current directory)
require('dotenv').config();

// Debug logging to see what environment is loaded
console.log('=== ENVIRONMENT DEBUG ===');
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('process.env.CHATSG_ENVIRONMENT:', process.env.CHATSG_ENVIRONMENT);
console.log('process.env.BACKEND:', process.env.BACKEND);
console.log('========================');

const http = require('http');
const https = require('https');
const { exec } = require('child_process');
const axios = require('axios');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { getPool } = require('./src/database/pool');

// Import security middleware and http adapter
const securityMiddleware = require('./middleware/security');
const { applyMiddleware, enhanceRequest, enhanceResponse, parseBody } = require('./middleware/http-adapter');
const { errorHandler } = require('./middleware/errorHandler');
const auth = require('./middleware/security/auth');
const csrf = require('./middleware/security/csrf');
const csrfHeader = require('./middleware/security/csrf-header');
const sseSecure = require('./middleware/security/sse');
const markdownConfig = require('./config/markdown.config.json');
const securityConfig = require('./config/security.config');

// Import performance monitoring
let performanceMonitoringMiddleware, performanceDashboardHandler, clearPerformanceStats, diagnosticsHandler;
try {
    const perfMonitor = require('./src/monitoring/performance-monitor');
    performanceMonitoringMiddleware = perfMonitor.performanceMonitoringMiddleware;
    const perfDashboard = require('./src/monitoring/performance-dashboard');
    performanceDashboardHandler = perfDashboard.performanceDashboardHandler;
    clearPerformanceStats = perfDashboard.clearPerformanceStats;
    console.log('[Server] Performance monitoring loaded');
} catch (error) {
    console.warn('[Server] Could not load performance monitoring:', error.message);
}

// Import connection diagnostics
try {
    const diagnostics = require('./src/monitoring/connection-diagnostics');
    diagnosticsHandler = diagnostics.diagnosticsHandler;
    console.log('[Server] Connection diagnostics loaded');
} catch (error) {
    console.warn('[Server] Could not load connection diagnostics:', error.message);
}

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

// Import memory visualization handlers
let memoryVisualizationHandlers;
try {
    memoryVisualizationHandlers = require('./dist/src/api/memory/visualization');
    console.log('[Server] Loaded memory visualization handlers');
} catch (error) {
    console.warn('[Server] Could not load memory visualization handlers:', error.message);
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
const ENVIRONMENT = process.env.CHATSG_ENVIRONMENT || 'production'; // Application environment
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
        // Use different command for macOS
        const command = process.platform === 'darwin' 
            ? "ifconfig | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | head -1"
            : 'hostname -I';
            
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('Error getting IP addresses:', error);
                resolve({ private: 'unknown' });
                return;
            }
            const privateIP = stdout.trim().split(' ')[0];
            resolve({ private: privateIP || 'unknown' });
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

// Handle SSE streaming request
async function handleSSERequest(req, res) {
    const origin = req.headers.origin || 'http://localhost:5173';
    console.log('[Server] Processing SSE request');
    console.log('[Server] req.body:', req.body);
    
    // Import performance tools at the top if available
    let MemoryOperationTimer, LLMOperationTimer, DatabaseOperationTimer, AgentRoutingTimer, recordOperation;
    if (process.env.ENABLE_PERFORMANCE_MONITORING === 'true') {
        try {
            const opTimers = require('./src/monitoring/operation-timers');
            MemoryOperationTimer = opTimers.MemoryOperationTimer;
            LLMOperationTimer = opTimers.LLMOperationTimer;
            DatabaseOperationTimer = opTimers.DatabaseOperationTimer;
            AgentRoutingTimer = opTimers.AgentRoutingTimer;
            const perfDash = require('./src/monitoring/performance-dashboard');
            recordOperation = perfDash.recordOperation;
        } catch (err) {
            console.warn('[Server] Performance monitoring modules not available');
        }
    }
    
    // Create performance timers
    const timers = {};
    if (process.env.ENABLE_PERFORMANCE_MONITORING === 'true' && MemoryOperationTimer) {
        const requestId = req.requestId || `sse-${Date.now()}`;
        timers.memory = new MemoryOperationTimer(requestId);
        timers.database = new DatabaseOperationTimer(requestId);
        timers.agent = new AgentRoutingTimer(requestId);
        console.log('[Server] Performance monitoring enabled for SSE request');
    }
    
    // Define userId at the top level of the function
    let userId = null;
    
    try {
        // Extract data from already-parsed body
        const data = req.body;
        if (!data) {
            throw new Error('Request body is null');
        }
        const sessionId = data.sessionId || 'default';
        console.log(`[Server] Streaming request for session: ${sessionId}, message: "${data.message}"`);
        
        // Get userId early if authenticated
        if (req.isAuthenticated && req.user) {
            userId = req.user.id;
        }
        
        // Set SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': origin,
            'X-Accel-Buffering': 'no' // Disable Nginx buffering
        });
        
        // Helper to send SSE events
        const sendEvent = (event, data) => {
            console.log(`[Server] Sending SSE event: ${event}`, data);
            res.write(`event: ${event}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };
        
        // Send initial connection event
        sendEvent('connected', { sessionId });
        
        // Process with real orchestrator
        const message = data.message || '';
        
        // Check for slash command metadata
        let routingMetadata = null;
        if (data.slashCommand) {
            console.log(`[Server] SSE: Frontend slash command metadata received:`, data.slashCommand);
            
            // Create routing metadata from frontend data
            routingMetadata = {
                forceAgent: true,
                agentType: data.slashCommand.agentType,
                commandName: data.slashCommand.command,
                confidence: 1.0,
                reason: `Frontend slash command: /${data.slashCommand.command}`
            };
            
            console.log(`[Server] SSE: Using frontend slash command: /${data.slashCommand.command} → ${data.slashCommand.agentType}`);
        }
        
        // Defer session operations until after agent selection
        const deferredSessionOps = async () => {
            if (storageManager && message) {
                try {
                    console.log(`[Server] Starting deferred session operations for: ${sessionId}`);
                    const sessionOpsStart = performance.now();
                    
                    // Time database operation for session check
                    const sessionCheckFn = async () => {
                        return storageManager.sessionExists(sessionId);
                    };
                    
                    const checkStart = performance.now();
                    const sessionExists = timers.database ? 
                        await timers.database.timeQuery('check-session', sessionCheckFn) :
                        await sessionCheckFn();
                    console.log(`[Server] Session check took: ${(performance.now() - checkStart).toFixed(2)}ms`);
                        
                    if (!req.isAuthenticated || !req.user) {
                        sendEvent('error', { error: 'Authentication required' });
                        res.end();
                        return;
                    }
                    // userId is already defined at the top level
                    
                    if (!sessionExists) {
                        // Time session creation
                        const createSessionFn = async () => {
                            return await storageManager.createSession({
                                sessionId: sessionId,
                                title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
                                userId: userId
                            });
                        };
                        
                        if (timers.database) {
                            await timers.database.timeQuery('create-session', createSessionFn);
                        } else {
                            await createSessionFn();
                        }
                        console.log(`[Server] Auto-created session: ${sessionId} for user: ${userId}`);
                    }
                    
                    // Save user message with slash command metadata
                    const userMessageMetadata = { userId: userId };
                    
                    // Add slash command metadata if present
                    if (data.slashCommand && routingMetadata) {
                        userMessageMetadata.slashCommand = {
                            command: data.slashCommand.command,
                            agentType: data.slashCommand.agentType
                        };
                        userMessageMetadata.forcedRouting = routingMetadata;
                    }
                    
                    // Time message save
                    const saveMessageFn = async () => {
                        return await storageManager.saveMessage({
                            sessionId: sessionId,
                            type: 'user',
                            content: message,
                            metadata: userMessageMetadata
                        });
                    };
                    
                    const saveStart = performance.now();
                    if (timers.database) {
                        await timers.database.timeQuery('save-user-message', saveMessageFn);
                    } else {
                        await saveMessageFn();
                    }
                    console.log(`[Server] Message save took: ${(performance.now() - saveStart).toFixed(2)}ms`);
                    console.log(`[Server] Total session operations took: ${(performance.now() - sessionOpsStart).toFixed(2)}ms`);
                } catch (storageError) {
                    console.error('[Server] Failed to save user message:', storageError);
                }
            }
        };
        
        // Create streaming callback
        let fullResponse = '';
        const streamCallback = (token) => {
            if (typeof token === 'object' && token.type === 'status') {
                // Handle tool-specific status events
                if (token.statusType === 'tool_start') {
                    sendEvent('tool_start', {
                        toolId: token.metadata.toolId,
                        toolName: token.metadata.toolName,
                        parameters: token.metadata.parameters,
                        agentName: token.metadata.agentName
                    });
                } else if (token.statusType === 'tool_progress') {
                    sendEvent('tool_progress', {
                        toolId: token.metadata.toolId,
                        progress: token.message,
                        metadata: token.metadata
                    });
                } else if (token.statusType === 'tool_result') {
                    sendEvent('tool_result', {
                        toolId: token.metadata.toolId,
                        result: token.metadata.result
                    });
                } else if (token.statusType === 'tool_error') {
                    sendEvent('tool_error', {
                        toolId: token.metadata.toolId,
                        error: token.metadata.error
                    });
                } else {
                    // Regular status event
                    sendEvent('status', {
                        type: token.statusType,
                        message: token.message,
                        metadata: token.metadata
                    });
                }
            } else {
                sendEvent('token', { content: token });
                fullResponse += token;
            }
        };
        
        // Route based on backend
        if (BACKEND === 'Orch' && backendIntegration) {
            console.log(`[ORCHESTRATOR] Processing with streaming: "${message}"`);
            
            try {
                let targetAgent;
                let selectedAgentName;
                
                // Check if we have forced routing from slash command
                if (routingMetadata && routingMetadata.forceAgent) {
                    console.log(`[ORCHESTRATOR] SSE: Forced routing to ${routingMetadata.agentType} via slash command /${routingMetadata.commandName}`);
                    
                    // Force route directly to specified agent, bypass orchestrator selection
                    const forcedAgentName = routingMetadata.agentType;
                    const availableAgents = orchestrationSetup.orchestrator.listAgents();
                    const targetAgentCapabilities = availableAgents.find(agentCap => 
                        agentCap.name === forcedAgentName || 
                        agentCap.type === forcedAgentName ||
                        agentCap.name.includes(forcedAgentName.replace('Agent', ''))
                    );
                    
                    targetAgent = targetAgentCapabilities ? 
                        orchestrationSetup.orchestrator.getAgent(targetAgentCapabilities.name) : null;
                    
                    if (targetAgent) {
                        selectedAgentName = targetAgentCapabilities.name;
                        console.log(`[ORCHESTRATOR] SSE: Found target agent: ${selectedAgentName} for forced routing`);
                    } else {
                        console.warn(`[ORCHESTRATOR] SSE: Could not find agent for type: ${forcedAgentName}, falling back to normal selection`);
                        
                        // Send user notification about fallback
                        res.write(`data: {"type": "error", "message": "⚠️ The /${routingMetadata.commandName} command isn't working (agent failed to load). I'll route your message to another agent instead.", "isSystemMessage": true}\n\n`);
                        
                        // Fall back to normal selection
                        const context = {
                            sessionId: sessionId,
                            userInput: message,
                            availableAgents: orchestrationSetup.orchestrator.listAgents().map(a => a.name),
                            userPreferences: {},
                            userId: userId
                        };
                        
                        const selection = await orchestrationSetup.orchestrator.selectAgent(message, context);
                        targetAgent = orchestrationSetup.orchestrator.getAgent(selection.selectedAgent);
                        selectedAgentName = selection.selectedAgent;
                    }
                } else {
                    // Normal agent selection
                    if (timers.agent) {
                        timers.agent.markRoutingStart();
                    }
                    
                    const context = {
                        sessionId: sessionId,
                        userInput: message,
                        availableAgents: orchestrationSetup.orchestrator.listAgents().map(a => a.name),
                        userPreferences: {},
                        userId: userId
                    };
                    
                    const selection = await orchestrationSetup.orchestrator.selectAgent(message, context);
                    targetAgent = orchestrationSetup.orchestrator.getAgent(selection.selectedAgent);
                    selectedAgentName = selection.selectedAgent;
                    
                    if (timers.agent) {
                        timers.agent.markAgentSelected(selectedAgentName);
                    }
                    console.log(`[ORCHESTRATOR] Selected ${selectedAgentName} for streaming`);
                }
                
                if (!targetAgent) {
                    throw new Error('No agent available');
                }
                
                const agentInfo = targetAgent.getInfo();
                sendEvent('start', { 
                    agent: agentInfo.name,
                    sessionId: sessionId
                });
                
                // Now that agent is selected and user knows, do the session operations
                setImmediate(() => {
                    deferredSessionOps().catch(err => {
                        console.error('[Server] Deferred session operations failed:', err);
                    });
                });
                
                // Create LLM timer if available
                if (timers.agent && LLMOperationTimer) {
                    timers.llm = new LLMOperationTimer(req.requestId || `sse-${Date.now()}`, agentInfo.model || 'unknown');
                    timers.llm.markRequestStart(message.length); // Approximate input tokens
                }
                
                // Mark agent execution start
                if (timers.agent) {
                    timers.agent.markAgentExecutionStart();
                }
                
                // Wrap the stream callback to track first token
                let firstTokenReceived = false;
                let tokenCount = 0;
                const wrappedStreamCallback = (token) => {
                    if (timers.llm && !firstTokenReceived && typeof token === 'string') {
                        timers.llm.markFirstTokenReceived();
                        firstTokenReceived = true;
                    }
                    if (typeof token === 'string') {
                        tokenCount++;
                    }
                    streamCallback(token);
                };
                
                // Process with streaming
                const result = await targetAgent.processMessage(message, sessionId, wrappedStreamCallback);
                
                // Mark execution end
                if (timers.agent) {
                    timers.agent.markAgentExecutionEnd();
                }
                if (timers.llm) {
                    timers.llm.markStreamingComplete(tokenCount);
                }
                
                // If no streaming happened, simulate it
                if (fullResponse === '') {
                    const responseText = result.message;
                    const chunkSize = 5;
                    
                    for (let i = 0; i < responseText.length; i += chunkSize) {
                        const chunk = responseText.slice(i, i + chunkSize);
                        sendEvent('token', { content: chunk });
                        fullResponse += chunk;
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                }
                
                // Debug memory status
                if (result.metadata?.memoryStatus) {
                    try {
                        console.log('[DEBUG] Memory status type:', typeof result.metadata.memoryStatus);
                        console.log('[DEBUG] Memory status:', JSON.stringify(result.metadata.memoryStatus, null, 2));
                    } catch (debugError) {
                        console.error('[DEBUG] Error serializing memory status:', debugError);
                    }
                }
                
                // Collect performance data if available
                let performanceData = null;
                if (timers.agent || timers.llm || timers.database) {
                    performanceData = {};
                    
                    if (timers.database && timers.database.getReport) {
                        const dbReport = timers.database.getReport();
                        performanceData.database = {
                            totalTime: parseFloat(dbReport?.totalDuration) || 0,
                            operations: dbReport?.measurements || {}
                        };
                    }
                    
                    if (timers.agent && timers.agent.getReport) {
                        const agentReport = timers.agent.getReport();
                        performanceData.agent = {
                            totalTime: parseFloat(agentReport?.totalDuration) || 0,
                            selection: parseFloat(agentReport?.measurements?.['agent-selection']?.duration) || 0,
                            execution: parseFloat(agentReport?.measurements?.['agent-execution']?.duration) || 0
                        };
                    }
                    
                    if (timers.llm && timers.llm.getReport) {
                        const llmReport = timers.llm.getReport();
                        performanceData.llm = {
                            totalTime: parseFloat(llmReport?.measurements?.['total-llm-time']?.duration) || 0,
                            ttft: parseFloat(llmReport?.measurements?.['time-to-first-token']?.duration) || 0,
                            tokens: tokenCount
                        };
                    }
                    
                    console.log('[Server] Performance data collected:', performanceData);
                }
                
                sendEvent('done', { 
                    agent: agentInfo.name,
                    agentType: agentInfo.type,
                    sessionId: sessionId,
                    memoryStatus: result.metadata?.memoryStatus,
                    orchestration: {
                        confidence: routingMetadata ? 1.0 : (result.metadata?.confidence || 1.0),
                        streaming: true,
                        forcedBySlashCommand: !!routingMetadata,
                        commandUsed: routingMetadata?.commandName
                    },
                    performance: performanceData
                });
                
                // Record operations to dashboard
                if (recordOperation && performanceData) {
                    if (performanceData.agent?.selection) {
                        recordOperation('routing', 'selection', performanceData.agent.selection);
                    }
                    if (performanceData.agent?.execution) {
                        recordOperation('routing', 'execution', performanceData.agent.execution);
                    }
                    if (performanceData.llm?.totalTime) {
                        recordOperation('llm', 'streaming', performanceData.llm.totalTime, {
                            ttft: performanceData.llm.ttft
                        });
                    }
                    // Record individual database operations, not the total
                    if (performanceData.database?.operations) {
                        let totalDbTime = 0;
                        for (const [opName, opData] of Object.entries(performanceData.database.operations)) {
                            const duration = parseFloat(opData.duration) || 0;
                            if (duration > 0) {
                                recordOperation('database', 'queries', duration);
                                totalDbTime += duration;
                            }
                        }
                        console.log(`[Server] Recorded ${Object.keys(performanceData.database.operations).length} database operations, total: ${totalDbTime.toFixed(2)}ms`);
                    }
                }
                
                // Save response asynchronously
                setImmediate(async () => {
                    if (storageManager && fullResponse) {
                        try {
                            await storageManager.saveMessage({
                                sessionId: sessionId,
                                type: 'assistant',
                                content: fullResponse,
                                metadata: {
                                    agent: agentInfo.name,
                                    agentType: agentInfo.type,
                                    confidence: result.metadata?.confidence || 1.0,
                                    streaming: true,
                                    memoryStatus: result.metadata?.memoryStatus
                                }
                            });
                        } catch (error) {
                            console.error('[Server] Failed to save response:', error);
                        }
                    }
                });
                
                // Close the SSE connection after streaming completes
                res.end();
                
            } catch (error) {
                console.error('[ORCHESTRATOR] Error:', error);
                sendEvent('error', { message: error.message });
                res.end();
            }
        } else {
            // Fallback test response
            sendEvent('start', { agent: 'test', sessionId });
            const testMsg = "Orchestrator not available. This is a test response.";
            for (const word of testMsg.split(' ')) {
                sendEvent('token', { content: word + ' ' });
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            sendEvent('done', { agent: 'test', sessionId });
            
            // Close the SSE connection after fallback response
            res.end();
        }
    } catch (error) {
        console.error('[Server] SSE error:', error);
        if (!res.headersSent) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
        } else {
            res.write(`event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`);
            res.end();
        }
    }
}

// Initialize session store with SSL handling
// Use our pool which already has the correct SSL settings
const sessionStore = new pgSession({
    pool: getPool(),
    tableName: 'session',
    createTableIfMissing: true
    // Don't specify conObject - it conflicts with the pool settings
});

// Session configuration
const sessionConfig = {
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'development-secret-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.SESSION_SECURE === 'true' || process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // 24 hours
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        domain: process.env.COOKIE_DOMAIN || undefined,
        path: '/'
    },
    name: process.env.SESSION_NAME || 'chatsg_session',
    // Trust proxy headers for Azure Gateway SSL termination
    proxy: process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production'
};

// Create session middleware with logging wrapper
const baseSessionMiddleware = session(sessionConfig);
const sessionMiddleware = (req, res, next) => {
    console.log('[Session] Processing request:', req.method, req.url);
    console.log('[Session] Cookie header:', req.headers.cookie);
    console.log('[Session] Request protocol:', req.protocol);
    console.log('[Session] X-Forwarded-Proto:', req.headers['x-forwarded-proto']);
    console.log('[Session] Cookie config:', {
        secure: sessionConfig.cookie.secure,
        sameSite: sessionConfig.cookie.sameSite,
        domain: sessionConfig.cookie.domain,
        path: sessionConfig.cookie.path
    });
    
    // If behind proxy and protocol is https, mark connection as secure
    if (sessionConfig.proxy && req.protocol === 'https') {
        req.connection.encrypted = true;
    }
    
    baseSessionMiddleware(req, res, (err) => {
        if (err) {
            console.error('[Session] Middleware error:', err);
            return next(err);
        }
        
        console.log('[Session] Session ID:', req.sessionID);
        console.log('[Session] Session data:', req.session ? JSON.stringify(req.session, null, 2) : 'No session');
        console.log('[Session] Session new?', req.session?.isNew);
        console.log('[Session] Session cookie:', req.session?.cookie);
        console.log('[Session] Set-Cookie header:', res.getHeader('Set-Cookie'));
        next();
    });
};

const server = http.createServer(async (req, res) => {
    // Apply performance monitoring if enabled
    if (process.env.ENABLE_PERFORMANCE_MONITORING === 'true' && performanceMonitoringMiddleware) {
        performanceMonitoringMiddleware(req, res, () => {});
    }
    
    // Apply session middleware to all requests
    try {
        // Enhance request/response for ALL endpoints (proxy detection, etc.)
        enhanceRequest(req);
        enhanceResponse(res);
        
        await applyMiddleware(sessionMiddleware, req, res);
        await applyMiddleware(auth.authenticate, req, res);
    } catch (error) {
        console.error('[Server] Session/Auth middleware error:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Session initialization failed' }));
        return;
    }
    
    // SSE endpoint will be handled after middleware, just like other endpoints
    
    // Apply security middleware for all other endpoints
    try {
        // Skip security for static files and OPTIONS
        if (req.method !== 'OPTIONS' && req.url.startsWith('/api/')) {
            console.log(`[Server] Applying security middleware for ${req.method} ${req.url}`);
            // Apply security middleware with CSRF disabled temporarily
            // We'll use header-based CSRF instead
            await applyMiddleware(securityMiddleware({ csrf: false }), req, res);
            console.log(`[Server] Security middleware passed for ${req.method} ${req.url}`);
            
            // Apply header-based CSRF for all API routes
            console.log('[Server] About to apply CSRF header middleware...');
            
            // Skip CSRF for read endpoint and auth endpoints
            if (req.url.match(/^\/api\/chats\/[^/]+\/read$/) || 
                req.url.startsWith('/api/auth/') ||
                req.url === '/api/config/security') {
                console.log('[Server] Skipping CSRF for auth/read/config endpoint');
                // Still initialize CSRF token for GET requests to these endpoints
                if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
                    await applyMiddleware(csrfHeader.initialize(), req, res);
                }
            } else if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
                await applyMiddleware(csrfHeader.initialize(), req, res);
            } else {
                await applyMiddleware(csrfHeader.verify, req, res);
            }
            console.log('[Server] CSRF header middleware completed');
        }
    } catch (error) {
        console.error('[Security] Middleware error:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Security check failed' }));
        return;
    }
    
    console.log(`[Server] Passed all middleware, continuing to routing for ${req.method} ${req.url}`);
    
    // Set CORS headers (after security checks)
    // Note: Can't use wildcard origin with credentials
    const origin = req.headers.origin || 'http://localhost:5173';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/api/debug/mem0-status' && req.method === 'GET') {
        // Debug endpoint to check Mem0 status
        const { STORAGE_CONFIG } = require('./dist/src/config/storage.config');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            mem0Enabled: STORAGE_CONFIG.mem0.enabled,
            mem0Config: {
                enabled: STORAGE_CONFIG.mem0.enabled,
                embeddingModel: STORAGE_CONFIG.mem0.embeddingModel,
                llmModel: STORAGE_CONFIG.mem0.llmModel,
                collectionName: STORAGE_CONFIG.mem0.collectionName,
                maxSearchResults: STORAGE_CONFIG.mem0.maxSearchResults,
                graphEnabled: STORAGE_CONFIG.mem0.graph.enabled
            },
            envVars: {
                MEM0_ENABLED: process.env.MEM0_ENABLED,
                MEM0_GRAPH_ENABLED: process.env.MEM0_GRAPH_ENABLED
            },
            timestamp: new Date().toISOString()
        }));
        return;
    }

    if (req.url === '/health' && req.method === 'GET') {
        // Health check endpoint
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.CHATSG_ENVIRONMENT || 'unknown',
            backend: process.env.BACKEND || 'unknown',
            orchestrator: orchestrationSetup ? 'initialized' : 'not initialized',
            storage: getStorageManager ? 'available' : 'not available',
            services: {
                mem0: process.env.MEM0_ENABLED === 'true',
                neo4j: process.env.MEM0_GRAPH_ENABLED === 'true'
            }
        }));
        return;
    }
    
    // Auth routes (already have session middleware from above)
    if (req.url.startsWith('/api/auth/')) {
        
        if (req.url === '/api/auth/login' && req.method === 'GET') {
            auth.login(req, res);
            return;
        }
        
        if (req.url.startsWith('/api/auth/callback') && req.method === 'GET') {
            auth.callback(req, res);
            return;
        }
        
        if (req.url === '/api/auth/logout' && req.method === 'POST') {
            auth.logout(req, res);
            return;
        }
        
        if (req.url === '/api/auth/user' && req.method === 'GET') {
            auth.getCurrentUser(req, res);
            return;
        }
        
        // Debug endpoint to check session status
        if (req.url === '/api/auth/session-debug' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                sessionId: req.sessionID,
                sessionExists: !!req.session,
                sessionData: req.session || {},
                cookieHeader: req.headers.cookie,
                isAuthenticated: req.isAuthenticated,
                user: req.user,
                cookieConfig: sessionConfig.cookie,
                timestamp: new Date().toISOString()
            }, null, 2));
            return;
        }
        
        // Comprehensive auth test endpoint
        if (req.url === '/api/auth/test-config' && req.method === 'GET') {
            const testResults = {
                environment: {
                    NODE_ENV: process.env.NODE_ENV,
                    CHATSG_ENVIRONMENT: process.env.CHATSG_ENVIRONMENT,
                    USE_MOCK_AUTH: process.env.USE_MOCK_AUTH
                },
                database: {
                    PGSSL: process.env.PGSSL,
                    DATABASE_SSL: process.env.DATABASE_SSL,
                    DATABASE_URL: process.env.DATABASE_URL ? 'configured' : 'not configured',
                    poolStatus: 'unknown'
                },
                cookies: {
                    SESSION_SECURE: process.env.SESSION_SECURE,
                    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
                    actualConfig: sessionConfig.cookie,
                    headersSent: req.headers.cookie || 'no cookies sent'
                },
                session: {
                    sessionId: req.sessionID,
                    sessionExists: !!req.session,
                    isNew: req.session?.isNew,
                    hasAuthState: !!req.session?.authState
                },
                proxy: {
                    trustProxy: sessionConfig.proxy,
                    detectedProtocol: req.protocol,
                    xForwardedProto: req.headers['x-forwarded-proto'],
                    xForwardedFor: req.headers['x-forwarded-for'],
                    connectionEncrypted: req.connection.encrypted
                },
                urls: {
                    FRONTEND_URL: process.env.FRONTEND_URL,
                    AZURE_REDIRECT_URI: process.env.AZURE_REDIRECT_URI,
                    requestOrigin: req.headers.origin,
                    requestHost: req.headers.host
                },
                azure: {
                    clientId: process.env.AZURE_CLIENT_ID ? 'configured' : 'missing',
                    tenantId: process.env.AZURE_TENANT_ID ? 'configured' : 'missing',
                    clientSecret: process.env.AZURE_CLIENT_SECRET ? 'configured' : 'missing'
                }
            };
            
            // Test database connection
            try {
                const pool = getPool();
                await pool.query('SELECT 1');
                testResults.database.poolStatus = 'connected';
            } catch (error) {
                testResults.database.poolStatus = `error: ${error.message}`;
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(testResults, null, 2));
            return;
        }
        
        // Import debug endpoints
        const authDebug = require('./src/api/auth-debug');
        
        // Test full auth flow
        if (req.url === '/api/auth/test-flow' && req.method === 'GET') {
            authDebug.testAuthFlow(req, res);
            return;
        }
        
        // Test session store
        if (req.url === '/api/auth/test-store' && req.method === 'GET') {
            authDebug.testSessionStore(req, res);
            return;
        }
        
        // Test OAuth state persistence
        if (req.url.startsWith('/api/auth/test-oauth-state') && req.method === 'GET') {
            authDebug.testOAuthState(req, res);
            return;
        }
        
        // Check environment configuration
        if (req.url === '/api/auth/check-env' && req.method === 'GET') {
            authDebug.checkEnvironment(req, res);
            return;
        }
        
        // Test cookies
        if (req.url === '/api/auth/test-cookies' && req.method === 'GET') {
            authDebug.testCookies(req, res);
            return;
        }
    }
    
    // System debug endpoints (require authentication)
    if (req.url.startsWith('/api/system/')) {
        // Import system debug module
        const systemDebug = require('./src/api/system-debug');
        
        if (req.url === '/api/system/test-database' && req.method === 'GET') {
            systemDebug.testDatabase(req, res);
            return;
        }
        
        if (req.url === '/api/system/test-storage' && req.method === 'GET') {
            systemDebug.testStorage(req, res);
            return;
        }
        
        if (req.url.startsWith('/api/system/test-memory') && req.method === 'GET') {
            systemDebug.testMemory(req, res);
            return;
        }
        
        if (req.url.startsWith('/api/system/test-chat') && req.method === 'GET') {
            systemDebug.testChat(req, res);
            return;
        }
        
        if (req.url === '/api/system/current-user' && req.method === 'GET') {
            systemDebug.getCurrentUser(req, res);
            return;
        }
        
        if (req.url === '/api/system/health' && req.method === 'GET') {
            systemDebug.systemHealth(req, res);
            return;
        }
        
        if (req.url === '/api/system/debug-pool' && req.method === 'GET') {
            systemDebug.debugPool(req, res);
            return;
        }
        
        if (req.url === '/api/system/check-code' && req.method === 'GET') {
            systemDebug.checkCompiledCode(req, res);
            return;
        }
        
        // Pool-specific debug endpoint
        if (req.url.startsWith('/api/system/test-pool') && req.method === 'GET') {
            const poolDebug = require('./src/api/pool-debug');
            poolDebug.testPoolConfig(req, res);
            return;
        }
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
    } else if (req.url === '/api/chat/stream' && req.method === 'POST') {
        // SSE streaming endpoint
        console.log('[Server] SSE streaming endpoint hit');
        handleSSERequest(req, res);
    } else if (req.url === '/api/chat' && req.method === 'POST') {
        console.log('[Server] Regular chat endpoint hit - THIS SHOULD NOT BE CALLED, USE STREAMING!');
        try {
            const data = req.body; // Body already parsed by middleware
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
                        const sessionExists = await storageManager.sessionExists(sessionId);
                        
                        if (!sessionExists) {
                            // Auto-create session on first message
                            if (!req.isAuthenticated || !req.user) {
                                sendEvent('error', { error: 'Authentication required for session creation' });
                                res.end();
                                return;
                            }
                            const userId = req.user.id;
                            await storageManager.createSession({
                                sessionId: sessionId,
                                title: data.message.substring(0, 50) + (data.message.length > 50 ? '...' : ''),
                                userId: userId,
                                metadata: {
                                }
                            });
                            console.log(`[Server] Auto-created session: ${sessionId} for user: ${userId}`);
                        }
                        
                        // Save user message with slash command metadata
                        if (!req.isAuthenticated || !req.user) {
                            sendEvent('error', { error: 'Authentication required for message saving' });
                            res.end();
                            return;
                        }
                        const userId = req.user.id;
                        const userMessageMetadata = {
                            userId: userId,
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
                        let slashCommandFallback = false;
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
                                                memoryStatus: forcedResult.result?.metadata?.memoryStatus,
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
                                    slashCommandFallback = true;
                                    
                                    // Fall through to normal orchestration with user notification
                                    // We'll add the notification to the response when normal orchestration completes
                                }
                            } else {
                                console.warn(`[ORCHESTRATOR] Forced agent ${forcedAgentName} not found in available agents: [${availableAgents.map(a => a.name).join(', ')}], falling back to normal orchestration`);
                                slashCommandFallback = true;
                                
                                // Fall through to normal orchestration with user notification
                                // We'll add the notification to the response when normal orchestration completes
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
                                    toolsUsed: orchResult.response._toolsUsed || [],
                                    memoryStatus: orchResult.response._memoryStatus
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
                        
                        // Add fallback notification if slash command failed
                        if (slashCommandFallback && routingMetadata) {
                            const fallbackMessage = `⚠️ The /${routingMetadata.commandName} command isn't working (agent failed to load). I routed your message to another agent instead.\n\n`;
                            orchResponse.message = fallbackMessage + (orchResponse.message || '');
                            orchResponse._fallbackNotification = {
                                occurred: true,
                                originalCommand: routingMetadata.commandName,
                                originalAgentType: routingMetadata.agentType
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
    } else if (req.url === '/api/performance/dashboard' && req.method === 'GET' && performanceDashboardHandler) {
        // Performance dashboard
        performanceDashboardHandler(req, res);
    } else if (req.url === '/api/performance/clear' && req.method === 'POST' && clearPerformanceStats) {
        // Clear performance stats
        clearPerformanceStats(req, res);
    } else if (req.url === '/api/diagnostics' && req.method === 'GET' && diagnosticsHandler) {
        // Connection diagnostics
        diagnosticsHandler(req, res);
    } else if (req.url === '/api/chats' && req.method === 'POST') {
        // Create a new chat session
        console.log('[Server] POST /api/chats endpoint hit');
        try {
            // Check if body is already parsed by middleware
            if (req.body) {
                console.log('[Server] Body already parsed:', req.body);
                const data = req.body;
                    
                    // Use storage manager to create session
                    if (storageManager) {
                        if (!req.isAuthenticated || !req.user) {
                            return res.status(401).json({ error: 'Authentication required' });
                        }
                        const userId = req.user.id;
                        
                        const sessionData = await storageManager.createSession({
                            title: data.title || 'New Chat',
                            userId: userId,
                            metadata: {
                                ...data.metadata,
                                userId: userId,
                                }
                        });
                        
                        // Return in the expected format
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            sessionId: sessionData.sessionId,
                            session: {
                                id: sessionData.sessionId,
                                title: sessionData.title,
                                createdAt: sessionData.createdAt,
                                status: sessionData.status,
                                messageCount: sessionData.messageCount || 0
                            }
                        }));
                    } else {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Storage manager not initialized' }));
                    }
            } else {
                // Body not parsed, parse it
                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                req.on('end', async () => {
                    try {
                        const data = JSON.parse(body);
                        
                        // Use storage manager to create session
                        if (storageManager) {
                            const userId = req.isAuthenticated && req.user ? req.user.id : null;
                            
                            const sessionData = await storageManager.createSession({
                                title: data.title || 'New Chat',
                                userId: userId,
                                metadata: {
                                    ...data.metadata,
                                    userId: userId,
                                }
                            });
                            
                            // Return in the expected format
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: true,
                                sessionId: sessionData.sessionId,
                                session: {
                                    id: sessionData.sessionId,
                                    title: sessionData.title,
                                    createdAt: sessionData.createdAt,
                                    status: sessionData.status,
                                    messageCount: sessionData.messageCount || 0
                                }
                            }));
                        } else {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Storage manager not initialized' }));
                        }
                    } catch (error) {
                        console.error('Failed to create chat:', error);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Failed to create chat session' }));
                    }
                });
            }
        } catch (error) {
            console.error('Chat creation API error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to create chat session' }));
        }
    } else if (req.url === '/api/chats' && req.method === 'GET') {
        // List all chat sessions
        try {
            // Use new storage manager if available
            if (storageManager) {
                // Filter sessions by authenticated user
                const listOptions = {
                    status: ['active', 'inactive'],
                    sortBy: 'lastActivityAt',
                    sortOrder: 'desc'
                };
                
                // If user is authenticated, only show their sessions
                if (req.isAuthenticated && req.user) {
                    listOptions.userId = req.user.id;
                } else {
                    // For unauthenticated users, show sessions with "default" userId
                    listOptions.userId = null;
                }
                
                console.log(`[Server] Listing chats for user: ${listOptions.userId}`);
                const sessions = await storageManager.listSessions(listOptions);
                
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
        
    // Memory visualization routes - require authentication
    } else if (req.url.match(/^\/api\/memory\/qdrant\/([^/]+)$/) && req.method === 'GET') {
        if (!req.isAuthenticated) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Authentication required' }));
            return;
        }
        
        if (memoryVisualizationHandlers) {
            const match = req.url.match(/^\/api\/memory\/qdrant\/([^/]+)$/);
            req.params = { userId: match[1] };
            memoryVisualizationHandlers.getQdrantVisualization(req, res);
        } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Memory visualization not available' }));
        }
        
    } else if (req.url.match(/^\/api\/memory\/neo4j\/([^/]+)$/) && req.method === 'GET') {
        if (!req.isAuthenticated) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Authentication required' }));
            return;
        }
        
        if (memoryVisualizationHandlers) {
            const match = req.url.match(/^\/api\/memory\/neo4j\/([^/]+)$/);
            req.params = { userId: match[1] };
            memoryVisualizationHandlers.getNeo4jVisualization(req, res);
        } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Memory visualization not available' }));
        }
        
    } else if (req.url.match(/^\/api\/memory\/nvl\/([^/]+)$/) && req.method === 'GET') {
        if (!req.isAuthenticated) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Authentication required' }));
            return;
        }
        
        if (memoryVisualizationHandlers) {
            const match = req.url.match(/^\/api\/memory\/nvl\/([^/]+)$/);
            req.params = { userId: match[1] };
            // For now, use the same handler as neo4j, but we'll create a dedicated one
            memoryVisualizationHandlers.getNvlVisualization ? 
                memoryVisualizationHandlers.getNvlVisualization(req, res) :
                memoryVisualizationHandlers.getNeo4jVisualization(req, res);
        } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Memory visualization not available' }));
        }
        
    } else if (req.url.match(/^\/api\/memory\/postgres\/([^/]+)$/) && req.method === 'GET') {
        if (!req.isAuthenticated) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Authentication required' }));
            return;
        }
        
        if (memoryVisualizationHandlers) {
            const match = req.url.match(/^\/api\/memory\/postgres\/([^/]+)$/);
            req.params = { userId: match[1] };
            memoryVisualizationHandlers.getPostgresVisualization(req, res);
        } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Memory visualization not available' }));
        }
        
    } else if (req.url.match(/^\/api\/memory\/postgres\/sessions\/([^/]+)$/) && req.method === 'GET') {
        if (!req.isAuthenticated) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Authentication required' }));
            return;
        }
        
        if (memoryVisualizationHandlers) {
            const match = req.url.match(/^\/api\/memory\/postgres\/sessions\/([^/]+)$/);
            req.params = { userId: match[1] };
            memoryVisualizationHandlers.getPostgresSessionVisualization(req, res);
        } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Memory visualization not available' }));
        }
        
    } else if (req.url === '/api/memory/users' && req.method === 'GET') {
        if (!req.isAuthenticated) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Authentication required' }));
            return;
        }
        
        // Check admin role for user list
        if (!req.user.groups || !req.user.groups.includes('admin')) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Admin access required' }));
            return;
        }
        
        if (memoryVisualizationHandlers) {
            memoryVisualizationHandlers.getUsersForAdmin(req, res);
        } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Memory visualization not available' }));
        }
        
    } else if (req.url.match(/^\/api\/memory\/stats\/([^/]+)$/) && req.method === 'GET') {
        if (!req.isAuthenticated) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Authentication required' }));
            return;
        }
        
        if (memoryVisualizationHandlers) {
            const match = req.url.match(/^\/api\/memory\/stats\/([^/]+)$/);
            req.params = { userId: match[1] };
            memoryVisualizationHandlers.getMemoryStatsForUser(req, res);
        } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Memory visualization not available' }));
        }
        
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
    } else if (req.url.match(/^\/api\/chats\/([^/]+)$/) && req.method === 'PATCH') {
        // Update chat (rename)
        try {
            const chatId = req.url.match(/^\/api\/chats\/([^/]+)$/)[1];
            const data = req.body; // Body already parsed by middleware
            
            console.log('[Server] PATCH /api/chats/:id - updating chat:', chatId, data);
            
            // Use new storage manager if available
            if (storageManager) {
                // Update the session title
                await storageManager.sessionIndex.updateSession(chatId, {
                    title: data.title
                });
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    chatId: chatId,
                    title: data.title,
                    _backend: BACKEND,
                    _storage: 'new'
                }));
                return;
            }
            
            // Fallback for non-storage manager
            res.writeHead(501, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: 'Chat rename not supported without storage manager',
                _backend: BACKEND
            }));
        } catch (error) {
            console.error('Update chat error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: 'Failed to update chat',
                details: error.message
            }));
        }
    } else if (req.url.match(/^\/api\/chats\/([^/]+)\/read$/) && req.method === 'PATCH') {
        // Mark chat as read
        console.log('[Server] PATCH /api/chats/:id/read endpoint hit');
        console.log('[Server] req.body:', req.body);
        try {
            const sessionId = req.url.match(/^\/api\/chats\/([^/]+)\/read$/)[1];
            console.log('[Server] Marking session as read:', sessionId);
            
            // Use new storage manager if available
            if (storageManager) {
                await storageManager.sessionIndex.markSessionAsRead(sessionId);
                console.log('[Server] Session marked as read successfully');
                
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
                    sender: msg.type === 'user' ? 'user' : 'bot',
                    memoryStatus: msg.metadata?.memoryStatus
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
        try {
            const data = req.body; // Body already parsed by middleware
            
            // Generate unique session ID if not provided
            const sessionId = data.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Use new storage manager if available
            if (storageManager) {
                // Use authenticated user's ID if available, otherwise 'default'
                const userId = req.isAuthenticated && req.user ? req.user.id : null;
                
                const sessionData = {
                    sessionId: sessionId,
                    title: data.title || 'New Chat',
                    userId: userId,
                    metadata: data.metadata || {}
                };
                
                console.log(`[Server] Creating chat session for user: ${userId}`);
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
                    if (!(await storageManager.sessionExists(sessionId))) {
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
    } else if (req.url === '/api/config/markdown' && req.method === 'GET') {
        // Markdown configuration endpoint
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(markdownConfig));
    } else if (req.url === '/api/config/security' && req.method === 'GET') {
        // Security configuration endpoint (sanitized for frontend)
        const sanitizedConfig = {
            validation: {
                maxMessageLength: securityConfig.validation.maxMessageLength,
                maxSessionIdLength: securityConfig.validation.maxSessionIdLength
            },
            csrf: {
                enabled: true
            },
            auth: {
                enabled: securityConfig.auth.enabled,
                requireAuth: securityConfig.auth.requireAuth
            }
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(sanitizedConfig));
    } else if (req.url === '/api/security/csrf-token' && req.method === 'GET') {
        // CSRF token endpoint
        // Since we're using raw Node.js, we need to handle this differently
        const token = csrf.generateToken();
        
        // Set the cookie
        const cookieOptions = [
            `csrf-token=${token}`,
            'SameSite=strict',
            `Max-Age=${60 * 60}` // 1 hour in seconds
        ];
        if (process.env.NODE_ENV === 'production') {
            cookieOptions.push('Secure');
        }
        
        res.setHeader('Set-Cookie', cookieOptions.join('; '));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ token }));
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