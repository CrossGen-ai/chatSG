// Debug endpoint specifically for pool issues

const { getPool, recreatePool } = require('../database/pool');

const testPoolConfig = async (req, res) => {
    const results = {
        timestamp: new Date().toISOString(),
        step1_environment: {
            PGSSL: process.env.PGSSL,
            DATABASE_SSL: process.env.DATABASE_SSL,
            NODE_ENV: process.env.NODE_ENV,
            DATABASE_URL: process.env.DATABASE_URL ? 'configured' : 'not configured'
        },
        step2_currentPool: {},
        step3_testQuery: {},
        step4_recreatePool: {},
        step5_testAfterRecreate: {}
    };

    try {
        // Step 2: Get current pool
        const pool = getPool();
        results.step2_currentPool = {
            exists: !!pool,
            totalCount: pool?.totalCount,
            idleCount: pool?.idleCount
        };

        // Step 3: Test query with current pool
        try {
            const result = await pool.query('SELECT 1 as test');
            results.step3_testQuery = {
                success: true,
                result: result.rows[0]
            };
        } catch (error) {
            results.step3_testQuery = {
                success: false,
                error: error.message
            };
        }

        // Step 4: Force recreate pool if requested
        if (req.query.recreate === 'true') {
            await recreatePool();
            results.step4_recreatePool = {
                recreated: true,
                newEnvironment: {
                    PGSSL: process.env.PGSSL,
                    DATABASE_SSL: process.env.DATABASE_SSL
                }
            };

            // Step 5: Test after recreate
            const newPool = getPool();
            try {
                const result = await newPool.query('SELECT 1 as test_after_recreate');
                results.step5_testAfterRecreate = {
                    success: true,
                    result: result.rows[0]
                };
            } catch (error) {
                results.step5_testAfterRecreate = {
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

module.exports = {
    testPoolConfig
};