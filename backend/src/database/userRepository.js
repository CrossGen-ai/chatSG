const { getPool } = require('../database/pool');

async function getUserByAzureId(azureId) {
  const pool = getPool();
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE azure_id = $1',
      [azureId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('[UserRepository] Error getting user by Azure ID:', error);
    throw error;
  }
}

async function getUserByEmail(email) {
  const pool = getPool();
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('[UserRepository] Error getting user by email:', error);
    throw error;
  }
}

async function createUser(user) {
  const pool = getPool();
  try {
    const result = await pool.query(
      `INSERT INTO users (azure_id, email, name, groups, last_login)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [user.azureId, user.email, user.name, user.groups || []]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[UserRepository] Error creating user:', error);
    throw error;
  }
}

async function updateUser(azureId, updates) {
  const pool = getPool();
  try {
    const result = await pool.query(
      `UPDATE users 
       SET email = $2, name = $3, groups = $4, last_login = CURRENT_TIMESTAMP
       WHERE azure_id = $1
       RETURNING *`,
      [azureId, updates.email, updates.name, updates.groups || []]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[UserRepository] Error updating user:', error);
    throw error;
  }
}

async function updateLastLogin(azureId) {
  const pool = getPool();
  try {
    const result = await pool.query(
      `UPDATE users 
       SET last_login = CURRENT_TIMESTAMP
       WHERE azure_id = $1
       RETURNING *`,
      [azureId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[UserRepository] Error updating last login:', error);
    throw error;
  }
}

async function deleteUser(azureId) {
  const pool = getPool();
  try {
    const result = await pool.query(
      'DELETE FROM users WHERE azure_id = $1 RETURNING *',
      [azureId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[UserRepository] Error deleting user:', error);
    throw error;
  }
}

module.exports = {
  getUserByAzureId,
  getUserByEmail,
  createUser,
  updateUser,
  updateLastLogin,
  deleteUser
};