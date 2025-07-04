/**
 * PostgreSQL Connection Test
 * Validates that we can connect to the PostgreSQL database
 * and creates the database if it doesn't exist
 */

require('dotenv').config({ path: '../../.env' });
const { Client } = require('pg');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

async function testConnection() {
  console.log('🔌 PostgreSQL Connection Test\n');

  // Connection config from environment variables
  const config = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD,
    // Don't specify database initially - we'll create it if needed
  };

  console.log('📋 Configuration:');
  console.log(`  Host: ${config.host}`);
  console.log(`  Port: ${config.port}`);
  console.log(`  User: ${config.user}`);
  console.log(`  Database: ${process.env.POSTGRES_DB || 'chatsg'}`);
  console.log();

  // First, try to connect without specifying a database
  const adminClient = new Client(config);
  
  try {
    console.log('1️⃣  Connecting to PostgreSQL...');
    await adminClient.connect();
    console.log(`${colors.green}✓ Connected to PostgreSQL server${colors.reset}`);

    // Check if database exists
    const dbName = process.env.POSTGRES_DB || 'chatsg';
    const result = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (result.rows.length === 0) {
      console.log(`\n${colors.yellow}⚠️  Database '${dbName}' does not exist${colors.reset}`);
      console.log('2️⃣  Creating database...');
      
      await adminClient.query(`CREATE DATABASE ${dbName}`);
      console.log(`${colors.green}✓ Database '${dbName}' created successfully${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ Database '${dbName}' exists${colors.reset}`);
    }

    await adminClient.end();

    // Now connect to the specific database
    console.log('\n3️⃣  Testing connection to database...');
    const dbClient = new Client({
      ...config,
      database: dbName
    });

    await dbClient.connect();
    console.log(`${colors.green}✓ Connected to database '${dbName}'${colors.reset}`);

    // Test a simple query
    console.log('\n4️⃣  Running test query...');
    const testResult = await dbClient.query('SELECT NOW() as current_time');
    console.log(`${colors.green}✓ Query successful${colors.reset}`);
    console.log(`  Server time: ${testResult.rows[0].current_time}`);

    // Check if any tables exist
    console.log('\n5️⃣  Checking tables...');
    const tablesResult = await dbClient.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const tableCount = parseInt(tablesResult.rows[0].table_count);
    
    if (tableCount === 0) {
      console.log(`${colors.yellow}ℹ️  No tables found (empty database)${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ Found ${tableCount} table(s)${colors.reset}`);
    }

    await dbClient.end();

    console.log(`\n${colors.green}✅ All tests passed! PostgreSQL is ready.${colors.reset}`);
    console.log('\n📌 Connection string for your app:');
    console.log(`   ${process.env.DATABASE_URL || `postgresql://${config.user}:****@${config.host}:${config.port}/${dbName}`}`);

  } catch (error) {
    console.error(`\n${colors.red}❌ Connection test failed${colors.reset}`);
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    
    // Provide helpful troubleshooting tips
    console.log('\n🔧 Troubleshooting tips:');
    if (error.code === 'ECONNREFUSED') {
      console.log('  • Check if Docker container "postgres-db" is running:');
      console.log('    docker ps | grep postgres-db');
      console.log('  • Start the container if needed:');
      console.log('    docker start postgres-db');
    } else if (error.code === 'ENOTFOUND') {
      console.log('  • Check POSTGRES_HOST in .env file');
      console.log('  • Ensure Docker is running');
    } else if (error.message.includes('password')) {
      console.log('  • Check POSTGRES_PASSWORD in .env file');
      console.log('  • Verify password matches Docker container configuration');
    }
    
    process.exit(1);
  }
}

// Run the test
testConnection().catch(console.error);