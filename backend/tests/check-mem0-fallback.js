// Check if we should use pgvector or fallback
require('dotenv').config({ path: '../.env' });
const { getPool } = require('../src/database/pool');

async function checkPgVector() {
    const pool = getPool();
    
    try {
        // Check if pgvector extension exists
        const extResult = await pool.query(`
            SELECT EXISTS (
                SELECT 1 FROM pg_extension WHERE extname = 'vector'
            );
        `);
        
        const hasPgVector = extResult.rows[0].exists;
        console.log('pgvector available:', hasPgVector);
        
        if (!hasPgVector) {
            console.log('\n⚠️  pgvector not available!');
            console.log('Mem0 will fall back to standard PostgreSQL storage without vector search.');
            console.log('\nTo enable vector search, use pgvector/pgvector Docker image:');
            console.log('docker run -d --name postgres-pgvector -p 5432:5432 \\');
            console.log('  -e POSTGRES_PASSWORD=your_password \\');
            console.log('  -e POSTGRES_DB=chatsg \\');
            console.log('  pgvector/pgvector:pg16');
        }
        
        // Check tables
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'mem0_%'
            ORDER BY table_name;
        `);
        
        console.log('\nMem0 tables created:');
        tablesResult.rows.forEach(row => {
            console.log('✓ ' + row.table_name);
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkPgVector();