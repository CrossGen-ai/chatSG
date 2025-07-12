// Comprehensive auth debugging endpoints

const crypto = require('crypto');

// Test endpoint to simulate the full auth flow locally
const testAuthFlow = async (req, res) => {
    const results = {
        timestamp: new Date().toISOString(),
        tests: {}
    };

    // Test 1: Session creation
    const testState = crypto.randomBytes(16).toString('hex');
    if (req.session) {
        req.session.testState = testState;
        results.tests.sessionCreation = {
            success: true,
            sessionId: req.sessionID,
            testState: testState
        };
    } else {
        results.tests.sessionCreation = {
            success: false,
            error: 'No session object'
        };
    }

    // Test 2: Session save
    try {
        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        results.tests.sessionSave = {
            success: true,
            message: 'Session saved to database'
        };
    } catch (error) {
        results.tests.sessionSave = {
            success: false,
            error: error.message
        };
    }

    // Test 3: Session reload
    try {
        await new Promise((resolve, reject) => {
            req.session.reload((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        results.tests.sessionReload = {
            success: true,
            reloadedState: req.session.testState,
            stateMatches: req.session.testState === testState
        };
    } catch (error) {
        results.tests.sessionReload = {
            success: false,
            error: error.message
        };
    }

    res.json(results);
};

// Test endpoint to check session store
const testSessionStore = async (req, res) => {
    const { getPool } = require('../../src/database/pool');
    const pool = getPool();
    
    const results = {
        timestamp: new Date().toISOString(),
        currentSession: {
            id: req.sessionID,
            exists: !!req.session,
            data: req.session
        },
        database: {}
    };

    try {
        // Check if session table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'session'
            );
        `);
        results.database.tableExists = tableCheck.rows[0].exists;

        // Count sessions
        if (results.database.tableExists) {
            const countResult = await pool.query('SELECT COUNT(*) FROM session');
            results.database.sessionCount = parseInt(countResult.rows[0].count);

            // Check current session in DB
            const sessionResult = await pool.query(
                'SELECT sid, expire, sess FROM session WHERE sid = $1',
                [req.sessionID]
            );
            if (sessionResult.rows.length > 0) {
                const row = sessionResult.rows[0];
                results.database.currentSessionInDb = {
                    found: true,
                    expire: row.expire,
                    data: row.sess
                };
            } else {
                results.database.currentSessionInDb = {
                    found: false
                };
            }
        }
    } catch (error) {
        results.database.error = error.message;
    }

    res.json(results);
};

// Test OAuth state persistence
const testOAuthState = async (req, res) => {
    const action = req.query.action;
    const results = {
        timestamp: new Date().toISOString(),
        action: action,
        sessionId: req.sessionID,
        cookie: req.headers.cookie,
        sessionData: req.session
    };

    if (action === 'set') {
        // Simulate setting OAuth state
        const state = crypto.randomBytes(16).toString('hex');
        const nonce = crypto.randomBytes(16).toString('hex');
        
        req.session.authState = { state, nonce };
        results.setState = { state, nonce };
        
        try {
            await new Promise((resolve, reject) => {
                req.session.save((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            results.saved = true;
        } catch (error) {
            results.saved = false;
            results.saveError = error.message;
        }
    } else if (action === 'get') {
        // Get current OAuth state
        results.authState = req.session?.authState || null;
    } else if (action === 'clear') {
        // Clear OAuth state
        delete req.session.authState;
        try {
            await new Promise((resolve, reject) => {
                req.session.save((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            results.cleared = true;
        } catch (error) {
            results.cleared = false;
            results.clearError = error.message;
        }
    }

    res.json(results);
};

// Check environment and configuration
const checkEnvironment = async (req, res) => {
    const results = {
        timestamp: new Date().toISOString(),
        environment: {
            NODE_ENV: process.env.NODE_ENV,
            CHATSG_ENVIRONMENT: process.env.CHATSG_ENVIRONMENT,
            USE_MOCK_AUTH: process.env.USE_MOCK_AUTH,
            TRUST_PROXY: process.env.TRUST_PROXY
        },
        session: {
            SECRET_SET: !!process.env.SESSION_SECRET,
            SESSION_NAME: process.env.SESSION_NAME || 'chatsg_session',
            SESSION_SECURE: process.env.SESSION_SECURE,
            SESSION_MAX_AGE: process.env.SESSION_MAX_AGE,
            COOKIE_DOMAIN: process.env.COOKIE_DOMAIN
        },
        azure: {
            CLIENT_ID_SET: !!process.env.AZURE_CLIENT_ID,
            TENANT_ID_SET: !!process.env.AZURE_TENANT_ID,
            CLIENT_SECRET_SET: !!process.env.AZURE_CLIENT_SECRET,
            REDIRECT_URI: process.env.AZURE_REDIRECT_URI,
            FRONTEND_URL: process.env.FRONTEND_URL
        },
        database: {
            DATABASE_URL_SET: !!process.env.DATABASE_URL,
            PGSSL: process.env.PGSSL,
            DATABASE_SSL: process.env.DATABASE_SSL
        },
        request: {
            protocol: req.protocol,
            secure: req.secure,
            ip: req.ip,
            headers: {
                host: req.headers.host,
                origin: req.headers.origin,
                'x-forwarded-proto': req.headers['x-forwarded-proto'],
                'x-forwarded-for': req.headers['x-forwarded-for']
            }
        }
    };

    res.json(results);
};

// Test cookie behavior
const testCookies = async (req, res) => {
    const results = {
        timestamp: new Date().toISOString(),
        received: {
            cookieHeader: req.headers.cookie,
            parsedCookies: req.cookies
        },
        sessionCookie: {
            name: process.env.SESSION_NAME || 'chatsg_session',
            value: req.cookies?.[process.env.SESSION_NAME || 'chatsg_session']
        },
        tests: {}
    };

    // Test setting a simple cookie
    const testCookieName = 'test_cookie';
    const testCookieValue = crypto.randomBytes(8).toString('hex');
    
    res.setHeader('Set-Cookie', `${testCookieName}=${testCookieValue}; Path=/; HttpOnly; SameSite=Lax`);
    results.tests.setTestCookie = {
        name: testCookieName,
        value: testCookieValue,
        instruction: 'Check if this cookie is received on next request'
    };

    // Check if we can read back our test cookie from previous request
    if (req.cookies?.[testCookieName]) {
        results.tests.previousTestCookie = {
            found: true,
            value: req.cookies[testCookieName]
        };
    }

    res.json(results);
};

module.exports = {
    testAuthFlow,
    testSessionStore,
    testOAuthState,
    checkEnvironment,
    testCookies
};