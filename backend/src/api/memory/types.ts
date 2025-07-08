/**
 * TypeScript types for memory visualization API
 */

// Base memory interfaces
export interface MemoryMetadata {
  sessionId: string;
  userId: string;
  timestamp: string;
  [key: string]: any;
}

export interface BaseMemoryItem {
  id: string;
  content: string;
  metadata: MemoryMetadata;
  createdAt: string;
  updatedAt?: string;
}

// Qdrant vector memory interfaces
export interface QdrantMemoryItem extends BaseMemoryItem {
  vector: number[];
  score?: number;
  embedding?: number[];
  similarity?: number;
}

export interface QdrantVisualizationData {
  id: string;
  content: string;
  metadata: MemoryMetadata;
  position: {
    x: number;
    y: number;
  };
  vector: number[];
  score?: number;
  timestamp: string;
}

// Neo4j graph memory interfaces
export interface Neo4jNode {
  id: string;
  label: string;
  properties: Record<string, any>;
  metadata: MemoryMetadata;
}

export interface Neo4jRelationship {
  id: string;
  type: string;
  startNode: string;
  endNode: string;
  properties: Record<string, any>;
  metadata: MemoryMetadata;
}

export interface Neo4jGraphData {
  nodes: Neo4jNode[];
  relationships: Neo4jRelationship[];
}

export interface Neo4jVisualizationData {
  id: string;
  label: string;
  content: string;
  metadata: MemoryMetadata;
  relationships: Array<{
    id: string;
    type: string;
    target: string;
    properties: Record<string, any>;
  }>;
  position?: {
    x: number;
    y: number;
  };
}

// PostgreSQL memory interfaces
export interface PostgresMemoryItem extends BaseMemoryItem {
  sessionId: string;
  sessionName: string;
  sessionStatus: 'active' | 'inactive' | 'archived' | 'deleted';
  messageCount: number;
  lastMessageAt: string;
  sessionCreatedAt: string;
  type: 'user' | 'assistant' | 'system';
  agentId?: string;
}

export interface PostgresSessionData {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'archived' | 'deleted';
  userId: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessageAt: string;
  memories: PostgresMemoryItem[];
}

// API request/response interfaces
export interface MemoryVisualizationRequest {
  userId: string;
  sessionId?: string;
  limit?: number;
  offset?: number;
  filters?: MemoryFilters;
}

export interface MemoryFilters {
  sessionStatus?: 'active' | 'inactive' | 'archived' | 'deleted';
  dateRange?: {
    start: string;
    end: string;
  };
  contentType?: 'user' | 'assistant' | 'system';
  sessionIds?: string[];
}

export interface MemoryVisualizationResponse<T> {
  success: boolean;
  data: T[];
  pagination?: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  metadata?: {
    totalSessions: number;
    totalMemories: number;
    dateRange: {
      earliest: string;
      latest: string;
    };
  };
}

// User interfaces for admin functionality
export interface UserInfo {
  id: string;
  email: string;
  name: string;
  azureId: string;
  groups: string[];
  createdAt: string;
  lastLogin?: string;
}

export interface UserListResponse {
  success: boolean;
  data: UserInfo[];
  pagination?: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Error interfaces
export interface MemoryAPIError {
  error: string;
  message: string;
  code?: string;
  details?: any;
}

// API endpoint response types
export type QdrantMemoryResponse = MemoryVisualizationResponse<QdrantVisualizationData>;
export type Neo4jMemoryResponse = MemoryVisualizationResponse<Neo4jVisualizationData>;
export type PostgresMemoryResponse = MemoryVisualizationResponse<PostgresMemoryItem>;

// Memory type enumeration
export enum MemoryType {
  QDRANT = 'qdrant',
  NEO4J = 'neo4j',
  POSTGRES = 'postgres'
}

// Memory visualization configuration
export interface MemoryVisualizationConfig {
  maxResults: number;
  defaultLimit: number;
  cacheTimeout: number;
  enablePagination: boolean;
  enableFiltering: boolean;
}

// Default configuration
export const DEFAULT_MEMORY_CONFIG: MemoryVisualizationConfig = {
  maxResults: 10000,
  defaultLimit: 100,
  cacheTimeout: 300000, // 5 minutes
  enablePagination: true,
  enableFiltering: true
};

// Validation schemas (for use with validation libraries)
export interface MemoryValidationSchemas {
  userId: {
    required: true;
    type: 'string';
    minLength: 1;
  };
  sessionId: {
    required: false;
    type: 'string';
    minLength: 1;
  };
  limit: {
    required: false;
    type: 'number';
    min: 1;
    max: 1000;
  };
  offset: {
    required: false;
    type: 'number';
    min: 0;
  };
}