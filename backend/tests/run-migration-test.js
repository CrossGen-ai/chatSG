#!/usr/bin/env node

// Set the database configuration for Docker PostgreSQL
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5433';
process.env.POSTGRES_USER = 'postgres';
process.env.POSTGRES_PASSWORD = 'postgres123';
process.env.POSTGRES_DB = 'chatsg';

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
    const pool = new Pool({
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB,
    });
    
    try {
        // First check if tables exist
        const checkResult = await pool.query(`
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename LIKE 'chat_%'
        `);
        
        console.log('Existing chat tables:', checkResult.rows);
        
        // Run the migration
        const migrationPath = path.join(__dirname, '../src/database/migrations/003_create_chat_tables.sql');
        const migrationSQL = await fs.readFile(migrationPath, 'utf-8');
        
        console.log('Running migration...');
        await pool.query(migrationSQL);
        console.log('Migration completed successfully!');
        
        // Verify tables were created
        const verifyResult = await pool.query(`
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename LIKE 'chat_%'
            ORDER BY tablename
        `);
        
        console.log('\nCreated tables:');
        verifyResult.rows.forEach(row => {
            console.log(`- ${row.tablename}`);
        });
        
    } catch (error) {
        console.error('Migration failed:', error);
        // Try to drop and recreate
        if (error.message.includes('already exists')) {
            console.log('\nTables already exist. Dropping and recreating...');
            try {
                const dropSQL = await fs.readFile(path.join(__dirname, '../src/database/migrations/drop_chat_tables.sql'), 'utf-8');
                await pool.query(dropSQL);
                console.log('Tables dropped.');
                
                const migrationPath = path.join(__dirname, '../src/database/migrations/003_create_chat_tables.sql');
                const migrationSQL = await fs.readFile(migrationPath, 'utf-8');
                await pool.query(migrationSQL);
                console.log('Tables recreated successfully!');
            } catch (dropError) {
                console.error('Failed to drop and recreate:', dropError);
            }
        }
    } finally {
        await pool.end();
    }
}

runMigration().catch(console.error);