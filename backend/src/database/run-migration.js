/**
 * Run database migrations
 * 
 * Usage: node run-migration.js [migration-file]
 * Example: node run-migration.js 002_create_mem0_tables.sql
 */

const fs = require('fs');
const path = require('path');
const { getPool } = require('./pool');

async function runMigration(migrationFile) {
    const pool = getPool();
    
    try {
        // Read migration file
        const migrationPath = path.join(__dirname, 'migrations', migrationFile);
        const sql = fs.readFileSync(migrationPath, 'utf8');
        
        console.log(`Running migration: ${migrationFile}`);
        console.log('=====================================\n');
        
        // Execute migration
        await pool.query(sql);
        
        console.log(`\n✓ Migration ${migrationFile} completed successfully!`);
        
    } catch (error) {
        console.error(`✗ Migration failed: ${error.message}`);
        throw error;
    } finally {
        await pool.end();
    }
}

// Get migration file from command line arguments
const migrationFile = process.argv[2];

if (!migrationFile) {
    console.error('Usage: node run-migration.js [migration-file]');
    console.error('Example: node run-migration.js 002_create_mem0_tables.sql');
    process.exit(1);
}

// Run the migration
runMigration(migrationFile)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));