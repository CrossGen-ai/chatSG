/**
 * Connection Diagnostics
 * 
 * Checks performance of database and vector store connections
 */

const { getPool } = require('../database/pool');
const { performance } = require('perf_hooks');

/**
 * Test database connection and query performance
 */
async function testDatabasePerformance() {
    const results = {
        connection: null,
        simpleQuery: null,
        sessionCheck: null,
        errors: []
    };
    
    try {
        const pool = getPool();
        
        // Test 1: Connection acquisition
        const connStart = performance.now();
        const client = await pool.connect();
        results.connection = performance.now() - connStart;
        
        try {
            // Test 2: Simple query
            const queryStart = performance.now();
            await client.query('SELECT 1');
            results.simpleQuery = performance.now() - queryStart;
            
            // Test 3: Session check query (similar to what's slow)
            const sessionStart = performance.now();
            // First, let's check if the sessions table exists
            const tableCheckResult = await client.query(`
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'sessions'
            `);
            results.sessionCheck = performance.now() - sessionStart;
            results.sessionTableExists = tableCheckResult.rows[0]?.count > 0;
            
            // Test 4: If table exists, try a real session query
            if (results.sessionTableExists) {
                const realQueryStart = performance.now();
                await client.query('SELECT COUNT(*) FROM sessions LIMIT 1');
                results.realSessionQuery = performance.now() - realQueryStart;
            }
            
        } finally {
            client.release();
        }
        
    } catch (error) {
        results.errors.push({
            test: 'database',
            error: error.message,
            stack: error.stack
        });
    }
    
    return results;
}

/**
 * Test Qdrant connection and query performance
 */
async function testQdrantPerformance() {
    const results = {
        health: null,
        collections: null,
        search: null,
        errors: []
    };
    
    try {
        const axios = require('axios');
        const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
        
        // Test 1: Health check
        const healthStart = performance.now();
        await axios.get(`${QDRANT_URL}/`);
        results.health = performance.now() - healthStart;
        
        // Test 2: List collections
        const collectionsStart = performance.now();
        const collectionsResponse = await axios.get(`${QDRANT_URL}/collections`);
        results.collections = performance.now() - collectionsStart;
        results.collectionsList = collectionsResponse.data.result?.collections || [];
        
        // Test 3: Search (if collection exists)
        const mem0Collection = results.collectionsList.find(c => c.name === 'mem0');
        if (mem0Collection) {
            const searchStart = performance.now();
            await axios.post(`${QDRANT_URL}/collections/mem0/points/search`, {
                vector: new Array(1536).fill(0.1), // dummy vector
                limit: 5
            });
            results.search = performance.now() - searchStart;
        }
        
    } catch (error) {
        results.errors.push({
            test: 'qdrant',
            error: error.message,
            url: error.config?.url,
            status: error.response?.status
        });
    }
    
    return results;
}

/**
 * Test file system performance
 */
async function testFileSystemPerformance() {
    const results = {
        readDir: null,
        writeFile: null,
        readFile: null,
        errors: []
    };
    
    try {
        const fs = require('fs').promises;
        const path = require('path');
        const testDir = path.join(__dirname, '../../data/sessions');
        const testFile = path.join(__dirname, '../../logs/perf-test.tmp');
        
        // Test 1: Read directory
        const readDirStart = performance.now();
        const files = await fs.readdir(testDir);
        results.readDir = performance.now() - readDirStart;
        results.fileCount = files.length;
        
        // Test 2: Write file
        const writeStart = performance.now();
        await fs.writeFile(testFile, 'test data');
        results.writeFile = performance.now() - writeStart;
        
        // Test 3: Read file
        const readStart = performance.now();
        await fs.readFile(testFile, 'utf8');
        results.readFile = performance.now() - readStart;
        
        // Cleanup
        await fs.unlink(testFile).catch(() => {});
        
    } catch (error) {
        results.errors.push({
            test: 'filesystem',
            error: error.message
        });
    }
    
    return results;
}

/**
 * Run all diagnostics
 */
async function runDiagnostics() {
    console.log('[Diagnostics] Starting connection diagnostics...');
    
    const results = {
        timestamp: new Date().toISOString(),
        environment: {
            NODE_ENV: process.env.NODE_ENV,
            POSTGRES_HOST: process.env.POSTGRES_HOST || 'localhost',
            POSTGRES_PORT: process.env.POSTGRES_PORT || '5432',
            QDRANT_URL: process.env.QDRANT_URL || 'http://localhost:6333',
            MEM0_ENABLED: process.env.MEM0_ENABLED === 'true'
        },
        database: await testDatabasePerformance(),
        qdrant: await testQdrantPerformance(),
        filesystem: await testFileSystemPerformance(),
        analysis: {}
    };
    
    // Analyze results
    const analysis = results.analysis;
    
    // Database analysis
    if (results.database.connection > 1000) {
        analysis.database = 'SLOW: Connection takes > 1s';
    } else if (results.database.connection > 100) {
        analysis.database = 'WARNING: Connection takes > 100ms';
    } else {
        analysis.database = 'OK';
    }
    
    // Qdrant analysis
    if (results.qdrant.health > 1000) {
        analysis.qdrant = 'SLOW: Health check takes > 1s';
    } else if (results.qdrant.search > 500) {
        analysis.qdrant = 'WARNING: Search takes > 500ms';
    } else {
        analysis.qdrant = 'OK';
    }
    
    // Filesystem analysis
    if (results.filesystem.readDir > 100) {
        analysis.filesystem = 'SLOW: Directory read takes > 100ms';
    } else {
        analysis.filesystem = 'OK';
    }
    
    console.log('[Diagnostics] Completed');
    return results;
}

/**
 * Express handler for diagnostics endpoint
 */
async function diagnosticsHandler(req, res) {
    try {
        const results = await runDiagnostics();
        res.json(results);
    } catch (error) {
        res.status(500).json({
            error: 'Diagnostics failed',
            message: error.message
        });
    }
}

module.exports = {
    runDiagnostics,
    diagnosticsHandler,
    testDatabasePerformance,
    testQdrantPerformance,
    testFileSystemPerformance
};