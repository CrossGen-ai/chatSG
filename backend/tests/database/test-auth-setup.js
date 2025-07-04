/**
 * Test Authentication Database Setup
 * Runs the user/session migration and verifies tables are created
 */

require('dotenv').config({ path: '../../.env' });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

async function runMigration() {
  console.log('🔐 Testing Authentication Database Setup\n');

  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB || 'chatsg'
  });

  try {
    console.log('1️⃣  Connecting to database...');
    await client.connect();
    console.log(`${colors.green}✓ Connected to database${colors.reset}`);

    // Check if tables exist before running migration
    console.log('\n2️⃣  Checking if tables exist...');
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'session')
    `);
    
    if (tableCheck.rows.length < 2) {
      console.log('  Tables not found, running migration...');
      const migrationPath = path.join(__dirname, '../../src/database/migrations/001_create_users.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      await client.query(migrationSQL);
      console.log(`${colors.green}✓ Migration executed successfully${colors.reset}`);
    } else {
      console.log(`${colors.yellow}ℹ️  Tables already exist, skipping migration${colors.reset}`);
    }

    // Verify tables
    console.log('\n3️⃣  Verifying tables...');
    
    // Check users table
    const usersCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    if (usersCheck.rows.length > 0) {
      console.log(`${colors.green}✓ Users table created with ${usersCheck.rows.length} columns${colors.reset}`);
      console.log('  Columns:', usersCheck.rows.map(r => r.column_name).join(', '));
    }

    // Check session table
    const sessionCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'session'
      ORDER BY ordinal_position
    `);
    
    if (sessionCheck.rows.length > 0) {
      console.log(`${colors.green}✓ Session table created with ${sessionCheck.rows.length} columns${colors.reset}`);
      console.log('  Columns:', sessionCheck.rows.map(r => r.column_name).join(', '));
    }

    // Check indexes
    console.log('\n4️⃣  Verifying indexes...');
    const indexCheck = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename IN ('users', 'session')
    `);
    
    console.log(`${colors.green}✓ Created ${indexCheck.rows.length} indexes${colors.reset}`);
    indexCheck.rows.forEach(idx => {
      console.log(`  - ${idx.indexname}`);
    });

    // Test user repository functions
    console.log('\n5️⃣  Testing user repository...');
    const { createUser, getUserByAzureId, updateLastLogin } = require('../../src/database/userRepository');
    
    // Create test user
    const testUser = {
      azureId: 'test-azure-id-' + Date.now(),
      email: 'test@example.com',
      name: 'Test User',
      groups: ['test-group']
    };
    
    const createdUser = await createUser(testUser);
    console.log(`${colors.green}✓ Created test user with ID: ${createdUser.id}${colors.reset}`);
    
    // Get user
    const retrievedUser = await getUserByAzureId(testUser.azureId);
    console.log(`${colors.green}✓ Retrieved user by Azure ID${colors.reset}`);
    
    // Update last login
    await updateLastLogin(testUser.azureId);
    console.log(`${colors.green}✓ Updated last login timestamp${colors.reset}`);
    
    // Clean up test user
    await client.query('DELETE FROM users WHERE azure_id = $1', [testUser.azureId]);
    console.log(`${colors.green}✓ Cleaned up test user${colors.reset}`);

    console.log(`\n${colors.green}✅ All database tests passed! Auth tables are ready.${colors.reset}`);

  } catch (error) {
    console.error(`\n${colors.red}❌ Database setup failed${colors.reset}`);
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the test
runMigration().catch(console.error);