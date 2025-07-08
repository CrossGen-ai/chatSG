// Check if pgvector tables exist
require('dotenv').config({ path: '../.env' });
const { getPool } = require('../src/database/pool');

async function checkTables() {
    const pool = getPool();
    
    try {
        // Check if pgvector extension exists
        const extResult = await pool.query(`
            SELECT EXISTS (
                SELECT 1 FROM pg_extension WHERE extname = 'vector'
            );
        `);
        console.log('pgvector extension installed:', extResult.rows[0].exists);
        
        // Check if mem0 tables exist
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'mem0_%'
            ORDER BY table_name;
        `);
        
        console.log('\nMem0 tables found:');
        tablesResult.rows.forEach(row => {
            console.log('- ' + row.table_name);
        });
        
        if (tablesResult.rows.length === 0) {
            console.log('⚠️  No mem0 tables found! Run the migration first.');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkTables();