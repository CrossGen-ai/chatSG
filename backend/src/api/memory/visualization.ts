/**
 * Memory visualization API endpoints
 */

import { 
  getPostgresMemories, 
  getPostgresSessionData, 
  getQdrantMemories, 
  getNeo4jGraphMemories, 
  getUserList, 
  getMemoryStats, 
  canAccessUserMemories, 
  getMemoryCount 
} from './queries';
import { 
  MemoryFilters, 
  MemoryVisualizationResponse, 
  QdrantVisualizationData, 
  Neo4jVisualizationData, 
  PostgresMemoryItem, 
  UserListResponse, 
  MemoryAPIError 
} from './types';

/**
 * Get Qdrant vector memories for visualization
 */
async function getQdrantVisualization(req: any, res: any) {
  try {
    const { userId } = req.params;
    const { sessionId, limit = 1000 } = req.query;
    
    // Validate user access
    const canAccess = await canAccessUserMemories(req.user.id, userId);
    if (!canAccess) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Access denied',
        message: 'You do not have permission to view this user\'s memories'
      }));
      return;
    }
    
    // Get vector memories
    const memories = await getQdrantMemories(userId, sessionId, parseInt(limit));
    
    // Get user stats for metadata
    const stats = await getMemoryStats(userId);
    
    const response: MemoryVisualizationResponse<QdrantVisualizationData> = {
      success: true,
      data: memories,
      metadata: {
        totalSessions: stats.totalSessions,
        totalMemories: stats.totalMessages,
        dateRange: {
          earliest: stats.earliestSession,
          latest: stats.latestSession
        }
      }
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  } catch (error) {
    console.error('[Memory API] Qdrant visualization error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Internal server error',
      message: 'Failed to fetch vector memories'
    }));
  }
}

/**
 * Get Neo4j graph memories for visualization
 */
async function getNeo4jVisualization(req: any, res: any) {
  try {
    const { userId } = req.params;
    const { sessionId, limit = 500 } = req.query;
    
    // Validate user access
    const canAccess = await canAccessUserMemories(req.user.id, userId);
    if (!canAccess) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Access denied',
        message: 'You do not have permission to view this user\'s memories'
      }));
      return;
    }
    
    // Get graph memories
    const memories = await getNeo4jGraphMemories(userId, sessionId, parseInt(limit));
    
    // Get user stats for metadata
    const stats = await getMemoryStats(userId);
    
    const response: MemoryVisualizationResponse<Neo4jVisualizationData> = {
      success: true,
      data: memories,
      metadata: {
        totalSessions: stats.totalSessions,
        totalMemories: stats.totalMessages,
        dateRange: {
          earliest: stats.earliestSession,
          latest: stats.latestSession
        }
      }
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  } catch (error) {
    console.error('[Memory API] Neo4j visualization error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Internal server error',
      message: 'Failed to fetch graph memories'
    }));
  }
}

/**
 * Get PostgreSQL memories for visualization
 */
async function getPostgresVisualization(req: any, res: any) {
  try {
    const { userId } = req.params;
    const { 
      sessionId, 
      limit = 100, 
      offset = 0, 
      sessionStatus, 
      contentType,
      dateStart,
      dateEnd 
    } = req.query;
    
    console.log('[Memory API] PostgreSQL visualization request:', {
      userId,
      reqUser: req.user,
      isAuthenticated: req.isAuthenticated,
      headers: req.headers
    });
    
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      console.error('[Memory API] No authenticated user found');
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Authentication required',
        message: 'Please log in to view memories'
      }));
      return;
    }
    
    // Validate user access
    const canAccess = await canAccessUserMemories(req.user.id, userId);
    if (!canAccess) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Access denied',
        message: 'You do not have permission to view this user\'s memories'
      }));
      return;
    }
    
    // Build filters
    const filters: MemoryFilters = {};
    
    if (sessionStatus) {
      filters.sessionStatus = sessionStatus;
    }
    
    if (contentType) {
      filters.contentType = contentType;
    }
    
    if (sessionId) {
      filters.sessionIds = [sessionId];
    }
    
    if (dateStart && dateEnd) {
      filters.dateRange = {
        start: dateStart,
        end: dateEnd
      };
    }
    
    // Get memories
    const memories = await getPostgresMemories(userId, filters, parseInt(limit), parseInt(offset));
    
    // Get total count for pagination
    const totalCount = await getMemoryCount(userId, filters);
    
    // Get user stats for metadata
    const stats = await getMemoryStats(userId);
    
    const response: MemoryVisualizationResponse<PostgresMemoryItem> = {
      success: true,
      data: memories,
      pagination: {
        offset: parseInt(offset),
        limit: parseInt(limit),
        total: totalCount,
        hasMore: (parseInt(offset) + parseInt(limit)) < totalCount
      },
      metadata: {
        totalSessions: stats.totalSessions,
        totalMemories: stats.totalMessages,
        dateRange: {
          earliest: stats.earliestSession,
          latest: stats.latestSession
        }
      }
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  } catch (error) {
    console.error('[Memory API] PostgreSQL visualization error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Internal server error',
      message: 'Failed to fetch PostgreSQL memories'
    }));
  }
}

/**
 * Get PostgreSQL session data for visualization
 */
async function getPostgresSessionVisualization(req: any, res: any) {
  try {
    const { userId } = req.params;
    const { limit = 100, offset = 0, sessionStatus, dateStart, dateEnd } = req.query;
    
    // Validate user access
    const canAccess = await canAccessUserMemories(req.user.id, userId);
    if (!canAccess) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Access denied',
        message: 'You do not have permission to view this user\'s sessions'
      }));
      return;
    }
    
    // Build filters
    const filters: MemoryFilters = {};
    
    if (sessionStatus) {
      filters.sessionStatus = sessionStatus;
    }
    
    if (dateStart && dateEnd) {
      filters.dateRange = {
        start: dateStart,
        end: dateEnd
      };
    }
    
    // Get session data
    const sessions = await getPostgresSessionData(userId, filters, parseInt(limit), parseInt(offset));
    
    // Get user stats for metadata
    const stats = await getMemoryStats(userId);
    
    const response = {
      success: true,
      data: sessions,
      pagination: {
        offset: parseInt(offset),
        limit: parseInt(limit),
        total: sessions.length,
        hasMore: sessions.length === parseInt(limit)
      },
      metadata: {
        totalSessions: stats.totalSessions,
        totalMemories: stats.totalMessages,
        dateRange: {
          earliest: stats.earliestSession,
          latest: stats.latestSession
        }
      }
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  } catch (error) {
    console.error('[Memory API] PostgreSQL session visualization error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Internal server error',
      message: 'Failed to fetch session data'
    }));
  }
}

/**
 * Get user list for admin functionality
 */
async function getUsersForAdmin(req: any, res: any) {
  try {
    // Check if user is admin
    if (!req.user.groups || !req.user.groups.includes('admin')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Access denied',
        message: 'Admin access required'
      }));
      return;
    }
    
    const { limit = 100, offset = 0 } = req.query;
    
    // Get user list
    const users = await getUserList(parseInt(limit), parseInt(offset));
    
    const response: UserListResponse = {
      success: true,
      data: users,
      pagination: {
        offset: parseInt(offset),
        limit: parseInt(limit),
        total: users.length,
        hasMore: users.length === parseInt(limit)
      }
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  } catch (error) {
    console.error('[Memory API] Get users error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Internal server error',
      message: 'Failed to fetch users'
    }));
  }
}

/**
 * Get memory statistics for a user
 */
async function getMemoryStatsForUser(req: any, res: any) {
  try {
    const { userId } = req.params;
    
    // Validate user access
    const canAccess = await canAccessUserMemories(req.user.id, userId);
    if (!canAccess) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Access denied',
        message: 'You do not have permission to view this user\'s statistics'
      }));
      return;
    }
    
    // Get memory stats
    const stats = await getMemoryStats(userId);
    
    const response = {
      success: true,
      data: stats
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  } catch (error) {
    console.error('[Memory API] Get memory stats error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Internal server error',
      message: 'Failed to fetch memory statistics'
    }));
  }
}

// Export all endpoint handlers
module.exports = {
  getQdrantVisualization,
  getNeo4jVisualization,
  getPostgresVisualization,
  getPostgresSessionVisualization,
  getUsersForAdmin,
  getMemoryStatsForUser
};