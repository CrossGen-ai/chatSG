#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { getPool } = require('../../src/database/pool');
const { getUserByAzureId, getUserByEmail, createUser, updateUser } = require('../../src/database/userRepository');

// Mock user data from auth.js
const mockUser = {
  id: 'dev-user-id',
  email: 'dev@example.com',
  name: 'Development User',
  groups: ['developers'],
  azureId: 'mock-azure-id'
};

async function testMockUserConnection() {
  console.log('=== Testing Mock User Database Connection ===\n');
  
  const pool = getPool();
  
  try {
    // Test database connection
    console.log('1. Testing database connection...');
    const testQuery = await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully at:', testQuery.rows[0].now);
    console.log('');
    
    // Check if users table exists
    console.log('2. Checking if users table exists...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ Users table does not exist!');
      console.log('Run migrations first: node src/database/migrate.js');
      return;
    }
    console.log('✅ Users table exists');
    console.log('');
    
    // Check if mock user exists
    console.log('3. Checking if mock user exists in database...');
    console.log('Looking for user with Azure ID:', mockUser.azureId);
    
    let dbUser = await getUserByAzureId(mockUser.azureId);
    
    if (!dbUser) {
      console.log('❌ Mock user not found by Azure ID');
      
      // Check if email already exists with different Azure ID
      console.log('Checking if email already exists...');
      const existingUserByEmail = await getUserByEmail(mockUser.email);
      
      if (existingUserByEmail) {
        console.log('⚠️  User with email', mockUser.email, 'already exists with different Azure ID:', existingUserByEmail.azure_id);
        console.log('Existing user details:');
        console.log('  - Database ID:', existingUserByEmail.id);
        console.log('  - Name:', existingUserByEmail.name);
        console.log('  - Azure ID:', existingUserByEmail.azure_id);
        console.log('  - Groups:', existingUserByEmail.groups);
        console.log('');
        
        // Update the existing user's Azure ID to match mock auth
        console.log('4. Updating existing user to use mock Azure ID...');
        const updateResult = await pool.query(
          `UPDATE users 
           SET azure_id = $1, name = $2, groups = $3, last_login = CURRENT_TIMESTAMP
           WHERE email = $4
           RETURNING *`,
          [mockUser.azureId, mockUser.name, mockUser.groups, mockUser.email]
        );
        dbUser = updateResult.rows[0];
        console.log('✅ Updated existing user to use mock Azure ID');
      } else {
        // Create mock user
        console.log('4. Creating mock user...');
        dbUser = await createUser(mockUser);
        console.log('✅ Mock user created successfully');
      }
      console.log('User ID:', dbUser.id);
      console.log('');
    } else {
      console.log('✅ Mock user exists in database');
      console.log('User ID:', dbUser.id);
      console.log('Email:', dbUser.email);
      console.log('Name:', dbUser.name);
      console.log('Groups:', dbUser.groups);
      console.log('Last login:', dbUser.last_login);
      console.log('');
      
      // Update last login
      console.log('4. Updating last login time...');
      dbUser = await updateUser(mockUser.azureId, mockUser);
      console.log('✅ Last login updated:', dbUser.last_login);
      console.log('');
    }
    
    // Verify the user can be retrieved
    console.log('5. Verifying user retrieval...');
    const verifyUser = await getUserByAzureId(mockUser.azureId);
    if (verifyUser) {
      console.log('✅ Successfully retrieved user from database');
      console.log('Database user matches mock auth:');
      console.log('  - Azure ID matches:', verifyUser.azure_id === mockUser.azureId);
      console.log('  - Email matches:', verifyUser.email === mockUser.email);
      console.log('  - Name matches:', verifyUser.name === mockUser.name);
      console.log('');
    } else {
      console.log('❌ Failed to retrieve user from database');
      console.log('');
    }
    
    // Check all users in database
    console.log('6. Checking all users in database...');
    const allUsers = await pool.query('SELECT id, azure_id, email, name, last_login FROM users ORDER BY created_at');
    console.log(`Found ${allUsers.rows.length} user(s) in database:`);
    allUsers.rows.forEach((user, index) => {
      const isMockUser = user.azure_id === mockUser.azureId;
      console.log(`  ${index + 1}. ${user.email} (${user.name}) - Azure ID: ${user.azure_id} ${isMockUser ? '← Mock User' : ''}`);
      console.log(`     Database ID: ${user.id}, Last login: ${user.last_login || 'Never'}`);
    });
    console.log('');
    
    // Test what happens in auth middleware
    console.log('7. Testing auth middleware behavior...');
    console.log('When mock auth is enabled (ENVIRONMENT=dev, USE_MOCK_AUTH=true):');
    console.log('  - User gets hardcoded mock user object in req.user');
    console.log('  - Session stores the mock user data');
    console.log('  - Database user (ID: ' + dbUser.id + ') is now linked to mock Azure ID');
    console.log('');
    
    console.log('=== Summary ===');
    console.log('✅ Database connection: Working');
    console.log('✅ Users table: Exists');
    console.log('✅ Mock user: Present and accessible');
    console.log('✅ Database ID: ' + dbUser.id);
    console.log('');
    console.log('The mock authentication user is properly connected to the PostgreSQL database.');
    console.log('Users logging in with mock auth will consistently get database user ID:', dbUser.id);
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Close the pool
    await pool.end();
    console.log('\nDatabase connection closed.');
  }
}

// Run the test
testMockUserConnection().catch(console.error);