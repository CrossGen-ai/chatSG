const { getAllUsers } = require('../../database/userRepository');

/**
 * Get all users (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllUsersHandler = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || !req.user.groups || !req.user.groups.includes('admin')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Insufficient permissions',
        message: 'Admin role required to access user list'
      }));
      return;
    }

    // Get all users from database
    const users = await getAllUsers();
    
    // Transform users to safe format (exclude sensitive info)
    const safeUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      groups: user.groups || [],
      azureId: user.azure_id,
      lastLogin: user.last_login
    }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      users: safeUsers,
      total: safeUsers.length
    }));
  } catch (error) {
    console.error('[Admin API] Error getting all users:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Internal server error',
      message: 'Failed to retrieve users'
    }));
  }
};

module.exports = {
  getAllUsersHandler
};