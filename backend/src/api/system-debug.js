// Comprehensive system debugging endpoints

const { getPool } = require('../database/pool');
const { getStorageManager } = require('../../dist/src/storage');

// Test database connections and pool status
const testDatabase = async (req, res) => {
    const results = {
        timestamp: new Date().toISOString(),
        environment: {
            PGSSL: process.env.PGSSL,
            DATABASE_SSL: process.env.DATABASE_SSL,
            NODE_ENV: process.env.NODE_ENV,
            DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'not set'
        },
        pool: {},
        queries: {},
        tables: {}
    };

    try {
        const pool = getPool();
        
        // Pool stats
        results.pool = {
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount
        };

        // Test basic query
        const timeResult = await pool.query('SELECT NOW() as current_time');
        results.queries.currentTime = timeResult.rows[0].current_time;

        // Check all tables
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `;
        const tablesResult = await pool.query(tablesQuery);
        results.tables.list = tablesResult.rows.map(r => r.table_name);

        // Count records in key tables
        for (const table of ['session', 'chat_sessions', 'chat_messages', 'users']) {
            if (results.tables.list.includes(table)) {
                const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
                results.tables[`${table}_count`] = parseInt(countResult.rows[0].count);
            }
        }

        // Check session table structure
        if (results.tables.list.includes('session')) {
            const schemaResult = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'session'
                ORDER BY ordinal_position
            `);
            results.tables.session_schema = schemaResult.rows;
        }

    } catch (error) {
        results.error = {
            message: error.message,
            code: error.code,
            detail: error.detail
        };
    }

    res.json(results);
};

// Test storage system
const testStorage = async (req, res) => {
    const results = {
        timestamp: new Date().toISOString(),
        storageManager: {},
        sessionOperations: {},
        messageOperations: {}
    };

    try {
        const storage = getStorageManager();
        
        // Storage manager status
        results.storageManager = {
            initialized: !!storage,
            type: storage?.constructor?.name
        };

        if (storage) {
            // List recent sessions
            const sessions = await storage.listSessions({ limit: 5 });
            results.sessionOperations.recentSessions = sessions.map(s => ({
                id: s.sessionId,
                title: s.title,
                messageCount: s.metadata?.messageCount,
                lastActivity: s.metadata?.lastActivity
            }));

            // Test session creation
            const testSessionId = `test-${Date.now()}`;
            const created = await storage.createSession(testSessionId, 'Test Session');
            results.sessionOperations.testCreate = {
                success: true,
                sessionId: created.sessionId
            };

            // Test message storage
            const testMessage = {
                sessionId: testSessionId,
                type: 'user',
                content: 'Test message',
                metadata: {}
            };
            await storage.saveMessage(testMessage);
            results.messageOperations.testSave = {
                success: true
            };

            // Read back
            const messages = await storage.getSessionHistory(testSessionId);
            results.messageOperations.readBack = {
                success: true,
                messageCount: messages.length
            };

            // Cleanup
            await storage.deleteSession(testSessionId);
            results.sessionOperations.cleanup = {
                success: true
            };
        }

    } catch (error) {
        results.error = {
            message: error.message,
            stack: error.stack
        };
    }

    res.json(results);
};

// Test memory systems (Mem0, Qdrant, Neo4j)
const testMemory = async (req, res) => {
    const results = {
        timestamp: new Date().toISOString(),
        mem0: {},
        qdrant: {},
        neo4j: {},
        integration: {}
    };

    try {
        const { Mem0Service } = require('../../dist/src/memory/Mem0Service');
        const mem0 = new Mem0Service();

        // Mem0 status
        results.mem0 = {
            enabled: process.env.MEM0_ENABLED === 'true',
            provider: process.env.MEM0_PROVIDER,
            models: process.env.MEM0_MODELS,
            pythonServiceUrl: 'http://localhost:8001'
        };

        // Test Mem0 connection
        if (results.mem0.enabled) {
            try {
                const axios = require('axios');
                const healthCheck = await axios.get('http://localhost:8001/health', { timeout: 2000 });
                results.mem0.pythonService = healthCheck.data;
            } catch (error) {
                results.mem0.pythonService = {
                    status: 'offline',
                    error: error.message
                };
            }
        }

        // Qdrant status
        results.qdrant = {
            url: process.env.QDRANT_URL || 'http://localhost:6333',
            connected: false
        };

        try {
            const axios = require('axios');
            const qdrantHealth = await axios.get(`${results.qdrant.url}/`, { timeout: 2000 });
            results.qdrant.connected = true;
            results.qdrant.version = qdrantHealth.data.version;
        } catch (error) {
            results.qdrant.error = error.message;
        }

        // Neo4j status
        results.neo4j = {
            enabled: process.env.MEM0_GRAPH_ENABLED === 'true',
            url: process.env.NEO4J_URL,
            connected: false
        };

        if (results.neo4j.enabled && results.neo4j.url) {
            // Basic Neo4j check would go here
            results.neo4j.status = 'Check not implemented';
        }

        // Test integrated memory operation
        if (results.mem0.enabled && req.query.testMemory === 'true') {
            try {
                const testMemory = await mem0.addMemory(
                    'System test memory',
                    { user_id: 'test-user', session_id: 'test-session' }
                );
                results.integration.testMemory = {
                    success: true,
                    memoryId: testMemory.id
                };
            } catch (error) {
                results.integration.testMemory = {
                    success: false,
                    error: error.message
                };
            }
        }

    } catch (error) {
        results.error = {
            message: error.message,
            stack: error.stack
        };
    }

    res.json(results);
};

// Test chat functionality
const testChat = async (req, res) => {
    const results = {
        timestamp: new Date().toISOString(),
        orchestrator: {},
        agents: {},
        llm: {}
    };

    try {
        // Check orchestrator status
        results.orchestrator = {
            mode: process.env.BACKEND,
            enabled: process.env.BACKEND === 'Orch'
        };

        // Check LLM configuration
        results.llm = {
            provider: process.env.CHAT_MODELS || process.env.MEM0_MODELS,
            openai: {
                configured: !!process.env.OPENAI_API_KEY,
                model: process.env.OPENAI_MODEL
            },
            azure: {
                configured: !!process.env.AZURE_OPENAI_API_KEY,
                endpoint: process.env.AZURE_OPENAI_ENDPOINT,
                deployment: process.env.AZURE_OPENAI_DEPLOYMENT
            }
        };

        // Test actual chat if requested
        if (req.query.testMessage) {
            const { AgentOrchestrator } = require('../../dist/src/routing');
            // This would require the orchestrator instance
            results.testChat = {
                status: 'Not implemented - would need orchestrator instance'
            };
        }

    } catch (error) {
        results.error = {
            message: error.message,
            stack: error.stack
        };
    }

    res.json(results);
};

// Get current user info
const getCurrentUser = async (req, res) => {
    const results = {
        timestamp: new Date().toISOString(),
        authenticated: req.isAuthenticated || !!req.user,
        session: {
            id: req.sessionID,
            exists: !!req.session,
            data: req.session
        },
        user: req.user || req.session?.user || null
    };

    // Get user from database if authenticated
    if (results.user?.id) {
        try {
            const pool = getPool();
            const userResult = await pool.query(
                'SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1',
                [results.user.id]
            );
            if (userResult.rows.length > 0) {
                results.userFromDb = userResult.rows[0];
            }
        } catch (error) {
            results.dbError = error.message;
        }
    }

    res.json(results);
};

// System health check
const systemHealth = async (req, res) => {
    const results = {
        timestamp: new Date().toISOString(),
        status: 'checking',
        services: {}
    };

    // Quick health checks for each service
    const checks = [
        {
            name: 'database',
            check: async () => {
                const pool = getPool();
                await pool.query('SELECT 1');
                return { status: 'healthy' };
            }
        },
        {
            name: 'storage',
            check: async () => {
                const storage = getStorageManager();
                return { status: storage ? 'healthy' : 'not initialized' };
            }
        },
        {
            name: 'mem0_python',
            check: async () => {
                if (process.env.MEM0_ENABLED !== 'true') return { status: 'disabled' };
                const axios = require('axios');
                const response = await axios.get('http://localhost:8001/health', { timeout: 1000 });
                return { status: 'healthy', data: response.data };
            }
        },
        {
            name: 'qdrant',
            check: async () => {
                const axios = require('axios');
                const url = process.env.QDRANT_URL || 'http://localhost:6333';
                await axios.get(`${url}/`, { timeout: 1000 });
                return { status: 'healthy' };
            }
        }
    ];

    // Run all checks in parallel
    const checkPromises = checks.map(async ({ name, check }) => {
        try {
            results.services[name] = await check();
        } catch (error) {
            results.services[name] = {
                status: 'unhealthy',
                error: error.message
            };
        }
    });

    await Promise.all(checkPromises);

    // Overall status
    const unhealthyServices = Object.entries(results.services)
        .filter(([_, service]) => service.status === 'unhealthy')
        .map(([name]) => name);

    results.status = unhealthyServices.length === 0 ? 'healthy' : 'degraded';
    results.unhealthyServices = unhealthyServices;

    res.json(results);
};

// Debug pool connections and environment
const debugPool = async (req, res) => {
    const { getPool } = require('../database/pool');
    const pool = getPool();
    
    const results = {
        timestamp: new Date().toISOString(),
        environment: {
            PGSSL: process.env.PGSSL,
            DATABASE_SSL: process.env.DATABASE_SSL,
            NODE_ENV: process.env.NODE_ENV,
            DATABASE_URL: process.env.DATABASE_URL ? 'configured' : 'not set'
        },
        poolStats: {
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount,
            ending: pool.ending || false,
            ended: pool.ended || false
        },
        queries: {}
    };

    // Test queries with detailed error info
    const testQueries = [
        { name: 'simple', sql: 'SELECT 1 as test' },
        { name: 'session_index', sql: 'SELECT COUNT(*) as count FROM session_index' },
        { name: 'messages', sql: 'SELECT COUNT(*) as count FROM messages LIMIT 1' },
        { name: 'session_table', sql: 'SELECT COUNT(*) as count FROM session' }
    ];

    for (const test of testQueries) {
        try {
            const result = await pool.query(test.sql);
            results.queries[test.name] = {
                success: true,
                result: result.rows[0]
            };
        } catch (err) {
            results.queries[test.name] = {
                success: false,
                error: err.message,
                code: err.code,
                detail: err.detail
            };
        }
    }

    // Check if pool is actually connected
    try {
        const client = await pool.connect();
        results.poolConnection = {
            connected: true,
            ssl: client.ssl ? 'enabled' : 'disabled',
            host: client.host,
            port: client.port
        };
        client.release();
    } catch (err) {
        results.poolConnection = {
            connected: false,
            error: err.message
        };
    }

    res.json(results);
};

// Check compiled code
const checkCompiledCode = async (req, res) => {
    const fs = require('fs').promises;
    const path = require('path');
    
    const results = {
        timestamp: new Date().toISOString(),
        files: {}
    };

    try {
        // Find the base directory (could be dist/src or src)
        const possiblePaths = [
            path.join(__dirname, '../storage/PostgresSessionIndex.js'), // If in src/api
            path.join(__dirname, '../../dist/src/storage/PostgresSessionIndex.js'), // If compiled
            path.join(process.cwd(), 'dist/src/storage/PostgresSessionIndex.js'), // From root
            path.join(process.cwd(), 'src/storage/PostgresSessionIndex.js') // Uncompiled
        ];
        
        let indexPath = null;
        for (const p of possiblePaths) {
            try {
                await fs.access(p);
                indexPath = p;
                break;
            } catch (e) {
                // Continue searching
            }
        }
        
        if (indexPath) {
            const indexContent = await fs.readFile(indexPath, 'utf8');
            results.files.PostgresSessionIndex = {
                path: indexPath,
                exists: true,
                hasThisPool: indexContent.includes('this.pool'),
                hasGetPool: indexContent.includes('getPool()'),
                line199: indexContent.split('\n')[198] || 'Line not found',
                lineCount: indexContent.split('\n').length
            };
        } else {
            results.files.PostgresSessionIndex = {
                exists: false,
                searchedPaths: possiblePaths
            };
        }

        // Check pool.js
        const poolPaths = [
            path.join(__dirname, '../database/pool.js'),
            path.join(__dirname, '../../dist/src/database/pool.js'),
            path.join(process.cwd(), 'dist/src/database/pool.js'),
            path.join(process.cwd(), 'src/database/pool.js')
        ];
        
        let poolPath = null;
        for (const p of poolPaths) {
            try {
                await fs.access(p);
                poolPath = p;
                break;
            } catch (e) {
                // Continue searching
            }
        }
        
        if (poolPath) {
            const poolContent = await fs.readFile(poolPath, 'utf8');
            results.files.pool = {
                path: poolPath,
                exists: true,
                hasPGSSLCheck: poolContent.includes("process.env.PGSSL === 'false'"),
                hasDATABASE_SSLCheck: poolContent.includes("process.env.DATABASE_SSL === 'false'")
            };
        } else {
            results.files.pool = {
                exists: false,
                searchedPaths: poolPaths
            };
        }

        // Environment at this moment
        results.currentEnv = {
            PGSSL: process.env.PGSSL,
            DATABASE_SSL: process.env.DATABASE_SSL,
            NODE_ENV: process.env.NODE_ENV,
            DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'not set'
        };
        
        // Debug info
        results.debug = {
            __dirname: __dirname,
            cwd: process.cwd(),
            scriptPath: __filename
        };

    } catch (error) {
        results.error = {
            message: error.message,
            stack: error.stack
        };
    }

    res.json(results);
};

module.exports = {
    testDatabase,
    testStorage,
    testMemory,
    testChat,
    getCurrentUser,
    systemHealth,
    debugPool,
    checkCompiledCode
};