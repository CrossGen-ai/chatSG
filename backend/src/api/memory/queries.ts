/**
 * Database query functions for memory visualization
 */

import { getMem0Service } from '../../memory/Mem0Service';
import { getPool } from '../../database/pool';
import { 
  MemoryFilters, 
  PostgresMemoryItem, 
  PostgresSessionData, 
  QdrantVisualizationData, 
  Neo4jVisualizationData,
  UserInfo
} from './types';

/**
 * Get PostgreSQL memories with advanced filtering
 */
export async function getPostgresMemories(
  userId: string, 
  filters: MemoryFilters = {},
  limit: number = 100,
  offset: number = 0
): Promise<PostgresMemoryItem[]> {
  const pool = getPool();
  
  try {
    let query = `
      SELECT 
        m.id,
        m.content,
        m.type,
        m.created_at as "createdAt",
        m.created_at as "updatedAt",
        m.metadata,
        s.id as "sessionId",
        s.title as "sessionName", 
        s.status as "sessionStatus",
        s.created_at as "sessionCreatedAt",
        s.last_activity_at as "sessionUpdatedAt",
        (SELECT COUNT(*) FROM chat_messages WHERE session_id = s.id) as "messageCount",
        (SELECT MAX(created_at) FROM chat_messages WHERE session_id = s.id) as "lastMessageAt",
        COALESCE(m.metadata->>'agent_id', '') as "agentId"
      FROM chat_messages m
      JOIN chat_sessions s ON m.session_id = s.id
      WHERE s.user_id = $1
    `;
    
    const params: any[] = [userId];
    let paramIndex = 2;
    
    // Apply filters
    if (filters.sessionStatus) {
      query += ` AND s.status = $${paramIndex}`;
      params.push(filters.sessionStatus);
      paramIndex++;
    }
    
    if (filters.contentType) {
      query += ` AND m.type = $${paramIndex}`;
      params.push(filters.contentType);
      paramIndex++;
    }
    
    if (filters.sessionIds && filters.sessionIds.length > 0) {
      query += ` AND s.id = ANY($${paramIndex}::text[])`;
      params.push(filters.sessionIds);
      paramIndex++;
    }
    
    if (filters.dateRange) {
      query += ` AND s.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(filters.dateRange.start, filters.dateRange.end);
      paramIndex += 2;
    }
    
    // Order by most recent first
    query += ` ORDER BY m.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[Memory Queries] Failed to get PostgreSQL memories:', error);
    throw error;
  }
}

/**
 * Get PostgreSQL session data with memory counts
 */
export async function getPostgresSessionData(
  userId: string,
  filters: MemoryFilters = {},
  limit: number = 100,
  offset: number = 0
): Promise<PostgresSessionData[]> {
  const pool = getPool();
  
  try {
    let query = `
      SELECT 
        s.id,
        s.title as name,
        s.status,
        s.user_id as "userId",
        s.created_at as "createdAt",
        s.updated_at as "updatedAt",
        COUNT(m.id) as "messageCount",
        MAX(m.created_at) as "lastMessageAt"
      FROM chat_sessions s
      LEFT JOIN chat_messages m ON s.id = m.session_id
      WHERE s.user_id = $1
    `;
    
    const params: any[] = [userId];
    let paramIndex = 2;
    
    // Apply filters
    if (filters.sessionStatus) {
      query += ` AND s.status = $${paramIndex}`;
      params.push(filters.sessionStatus);
      paramIndex++;
    }
    
    if (filters.dateRange) {
      query += ` AND s.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(filters.dateRange.start, filters.dateRange.end);
      paramIndex += 2;
    }
    
    query += ` GROUP BY s.id, s.session_name, s.status, s.user_id, s.created_at, s.updated_at`;
    query += ` ORDER BY s.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // For each session, get the memories
    const sessions: PostgresSessionData[] = [];
    for (const row of result.rows) {
      const memories = await getPostgresMemories(userId, { sessionIds: [row.id] });
      sessions.push({
        ...row,
        memories
      });
    }
    
    return sessions;
  } catch (error) {
    console.error('[Memory Queries] Failed to get PostgreSQL session data:', error);
    throw error;
  }
}

/**
 * Get Qdrant vector memories for visualization
 */
export async function getQdrantMemories(
  userId: number,
  sessionId?: string,
  limit: number = 1000
): Promise<QdrantVisualizationData[]> {
  try {
    const memoryService = getMem0Service();
    await memoryService.initialize();
    
    const searchOptions: any = {
      userId,
      limit
    };
    
    if (sessionId) {
      searchOptions.sessionId = sessionId;
    }
    
    // Get all memories for the user
    let memories;
    if (sessionId) {
      memories = await memoryService.getSessionMemories(sessionId, userId, limit);
    } else {
      // Get all memories for the user across all sessions by passing empty sessionId
      const mem0 = memoryService as any;
      const options = {
        userId: userId?.toString() || 'default',
        limit: limit || 1000
      };
      const result = await mem0.memory.getAll(options);
      memories = result.results || [];
    }
    
    // Transform memories for visualization
    const visualizationData: QdrantVisualizationData[] = [];
    
    for (let i = 0; i < memories.length; i++) {
      const memory = memories[i];
      
      // Use PCA or t-SNE for dimensionality reduction in a real implementation
      // For now, we'll use a simple 2D projection
      const position = {
        x: Math.random() * 800 + 100, // Random positioning for demo
        y: Math.random() * 600 + 100
      };
      
      visualizationData.push({
        id: memory.id,
        content: memory.memory || memory.content || '',
        metadata: {
          sessionId: memory.metadata?.sessionId || sessionId || '',
          userId: userId,
          timestamp: memory.created_at || new Date().toISOString(),
          ...memory.metadata
        },
        position,
        vector: memory.vector || [],
        score: memory.score,
        timestamp: memory.created_at || new Date().toISOString()
      });
    }
    
    return visualizationData;
  } catch (error) {
    console.error('[Memory Queries] Failed to get Qdrant memories:', error);
    throw error;
  }
}

/**
 * Get Neo4j graph memories for visualization
 */
export async function getNeo4jGraphMemories(
  userId: number,
  sessionId?: string,
  limit: number = 500
): Promise<Neo4jVisualizationData[]> {
  try {
    const memoryService = getMem0Service();
    await memoryService.initialize();
    
    // Get memories from mem0 service
    let memories;
    if (sessionId) {
      memories = await memoryService.getSessionMemories(sessionId, userId, limit);
    } else {
      // Get all memories for the user across all sessions by passing empty sessionId
      const mem0 = memoryService as any;
      const options = {
        userId: userId?.toString() || 'default',
        limit: limit || 500
      };
      const result = await mem0.memory.getAll(options);
      memories = result.results || [];
    }
    
    // Transform memories into graph visualization format
    const visualizationData: Neo4jVisualizationData[] = [];
    
    for (let i = 0; i < memories.length; i++) {
      const memory = memories[i];
      
      // Create relationships based on memory content similarity or metadata
      const relationships: Array<{
        id: string;
        type: string;
        target: string;
        properties: Record<string, any>;
      }> = [];
      
      // In a real implementation, you would query Neo4j for actual relationships
      // For now, create some sample relationships
      if (i > 0) {
        relationships.push({
          id: `rel_${memory.id}_${i}`,
          type: 'RELATES_TO',
          target: memories[i - 1].id,
          properties: {
            similarity: Math.random()
          }
        });
      }
      
      visualizationData.push({
        id: memory.id,
        label: memory.memory?.substring(0, 50) || `Memory ${i + 1}`,
        content: memory.memory || memory.content || '',
        metadata: {
          sessionId: memory.metadata?.sessionId || sessionId || '',
          userId: userId,
          timestamp: memory.created_at || new Date().toISOString(),
          ...memory.metadata
        },
        relationships,
        position: {
          x: Math.random() * 800 + 100,
          y: Math.random() * 600 + 100
        }
      });
    }
    
    return visualizationData;
  } catch (error) {
    console.error('[Memory Queries] Failed to get Neo4j graph memories:', error);
    throw error;
  }
}

/**
 * Get user list for admin functionality
 */
export async function getUserList(
  limit: number = 100,
  offset: number = 0
): Promise<UserInfo[]> {
  const pool = getPool();
  
  try {
    const query = `
      SELECT 
        id,
        email,
        name,
        azure_id as "azureId",
        groups,
        created_at as "createdAt",
        last_login as "lastLogin"
      FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  } catch (error) {
    console.error('[Memory Queries] Failed to get user list:', error);
    throw error;
  }
}

/**
 * Get memory statistics for a user
 */
export async function getMemoryStats(userId: string): Promise<any> {
  const pool = getPool();
  
  try {
    const query = `
      SELECT 
        COUNT(DISTINCT s.id) as "totalSessions",
        COUNT(m.id) as "totalMessages",
        MIN(s.created_at) as "earliestSession",
        MAX(s.created_at) as "latestSession",
        COUNT(CASE WHEN s.status = 'active' THEN 1 END) as "activeSessions",
        COUNT(CASE WHEN s.status = 'inactive' THEN 1 END) as "inactiveSessions"
      FROM chat_sessions s
      LEFT JOIN chat_messages m ON s.id = m.session_id
      WHERE s.user_id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  } catch (error) {
    console.error('[Memory Queries] Failed to get memory stats:', error);
    throw error;
  }
}

/**
 * Check if user has access to specific user's memories (for admin functionality)
 */
export async function canAccessUserMemories(
  requestingUserId: string,
  targetUserId: string
): Promise<boolean> {
  const pool = getPool();
  
  try {
    // Same user can always access their own memories
    if (requestingUserId === targetUserId) {
      return true;
    }
    
    // Check if requesting user has admin role
    const query = `
      SELECT 1
      FROM users
      WHERE id = $1 AND 'admin' = ANY(groups)
    `;
    
    const result = await pool.query(query, [requestingUserId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('[Memory Queries] Failed to check user access:', error);
    return false;
  }
}

/**
 * Get total count for pagination
 */
export async function getMemoryCount(
  userId: string,
  filters: MemoryFilters = {}
): Promise<number> {
  const pool = getPool();
  
  try {
    let query = `
      SELECT COUNT(*)
      FROM chat_messages m
      JOIN chat_sessions s ON m.session_id = s.id
      WHERE s.user_id = $1
    `;
    
    const params: any[] = [userId];
    let paramIndex = 2;
    
    // Apply same filters as in getPostgresMemories
    if (filters.sessionStatus) {
      query += ` AND s.status = $${paramIndex}`;
      params.push(filters.sessionStatus);
      paramIndex++;
    }
    
    if (filters.contentType) {
      query += ` AND m.type = $${paramIndex}`;
      params.push(filters.contentType);
      paramIndex++;
    }
    
    if (filters.sessionIds && filters.sessionIds.length > 0) {
      query += ` AND s.id = ANY($${paramIndex}::text[])`;
      params.push(filters.sessionIds);
      paramIndex++;
    }
    
    if (filters.dateRange) {
      query += ` AND s.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(filters.dateRange.start, filters.dateRange.end);
      paramIndex += 2;
    }
    
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('[Memory Queries] Failed to get memory count:', error);
    throw error;
  }
}