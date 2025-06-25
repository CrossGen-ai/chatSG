import axios from 'axios';

export interface ChatResponse {
  message: string;
  agent?: string;
  sessionId?: string;
  timestamp?: string;
  backend?: string;
  orchestration?: {
    confidence?: number;
    reason?: string;
    executionTime?: number;
    agentLockUsed?: boolean;
  };
}

export async function sendChatMessage(
  message: string, 
  sessionId?: string, 
  options?: { signal?: AbortSignal }
): Promise<ChatResponse> {
  try {
    const response = await axios.post('/api/chat', { 
      message,
      sessionId: sessionId || 'default'
    }, {
      signal: options?.signal
    });
    
    // Return the full response with agent information
    return {
      message: response.data.message,
      agent: response.data._agent,
      sessionId: response.data._session,
      timestamp: response.data._timestamp,
      backend: response.data._backend,
      orchestration: response.data._orchestration
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw error;
    }
    return {
      message: 'Sorry, there was an error contacting the chat server.'
    };
  }
}

// Chat Settings API
export interface ChatSettings {
  crossSessionMemory: boolean;
  agentLock: boolean;
  preferredAgent?: string;
  lastAgentUsed?: string;
  agentLockTimestamp?: Date;
}

export async function getChatSettings(sessionId: string): Promise<{
  sessionId: string;
  settings: ChatSettings;
  metadata: any;
}> {
  try {
    const response = await axios.get(`/api/chats/${sessionId}/settings`);
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to get chat settings: ${error.response?.data?.error || error.message}`);
  }
}

export async function updateChatSettings(
  sessionId: string, 
  settings: Partial<ChatSettings>
): Promise<{
  sessionId: string;
  settings: ChatSettings;
  success: boolean;
}> {
  try {
    const response = await axios.post(`/api/chats/${sessionId}/settings`, {
      settings
    });
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to update chat settings: ${error.response?.data?.error || error.message}`);
  }
}

// Chat History API
export interface ChatMessage {
  id: number;
  content: string;
  type: string;
  timestamp: string;
  agent?: string;
}

export interface AgentInteraction {
  agentName: string;
  timestamp: Date;
  confidence: number;
  reason?: string;
  handoffFrom?: string;
}

export interface ToolUsage {
  toolName: string;
  timestamp: Date;
  parameters: any;
  result: any;
  success: boolean;
  executionTime?: number;
  agentName?: string;
}

export async function getChatHistory(sessionId: string): Promise<{
  sessionId: string;
  messages: ChatMessage[];
  messageCount: number;
  agentHistory: AgentInteraction[];
  toolsUsed: ToolUsage[];
  analytics: any;
}> {
  try {
    const response = await axios.get(`/api/chats/${sessionId}/history`);
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to get chat history: ${error.response?.data?.error || error.message}`);
  }
}

// Agent History API
export interface AgentStats {
  name: string;
  totalInteractions: number;
  averageConfidence: number;
  lastUsed: Date;
  handoffs: {
    from: number;
    to: number;
  };
}

export async function getAgentHistory(sessionId: string): Promise<{
  sessionId: string;
  agentHistory: AgentInteraction[];
  agentStats: AgentStats[];
  toolsUsed: ToolUsage[];
  currentAgent: string | null;
}> {
  try {
    const response = await axios.get(`/api/chats/${sessionId}/agents`);
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to get agent history: ${error.response?.data?.error || error.message}`);
  }
}

// Cross-Session Memory API
export interface CrossSessionMemoryAction {
  action: 'get' | 'share' | 'load';
  sessionId: string;
  targetSessionId?: string;
  userId?: string;
}

export interface SessionSummary {
  sessionId: string;
  agentHistory: AgentInteraction[];
  keyToolsUsed: ToolUsage[];
  preferences: ChatSettings;
  analytics: any;
  sharedAt: Date;
}

// Separate response types for different actions
export interface CrossSessionGetResponse {
  success: boolean;
  action: 'get';
  memory: { sessions: SessionSummary[] };
  sessions: SessionSummary[];
}

export interface CrossSessionShareResponse {
  success: boolean;
  action: 'share';
  sessionId: string;
  sharedSessions: number;
}

export interface CrossSessionLoadResponse {
  success: boolean;
  action: 'load';
  sourceSessionId: string;
  targetSessionId: string;
  memory: {
    agentHistory: AgentInteraction[];
    preferences: ChatSettings;
    analytics: any;
  };
}

export async function manageCrossSessionMemory(
  params: CrossSessionMemoryAction
): Promise<CrossSessionGetResponse | CrossSessionShareResponse | CrossSessionLoadResponse> {
  try {
    const response = await axios.post('/api/memory/cross-session', params);
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to manage cross-session memory: ${error.response?.data?.error || error.message}`);
  }
}

// Convenience functions for cross-session memory
export async function getCrossSessionMemory(userId?: string): Promise<SessionSummary[]> {
  const result = await manageCrossSessionMemory({
    action: 'get',
    sessionId: 'current',
    userId
  }) as CrossSessionGetResponse;
  return result.sessions || [];
}

export async function shareCrossSessionMemory(sessionId: string, userId?: string): Promise<number> {
  const result = await manageCrossSessionMemory({
    action: 'share',
    sessionId,
    userId
  }) as CrossSessionShareResponse;
  return result.sharedSessions || 0;
}

export async function loadCrossSessionMemory(
  sessionId: string, 
  targetSessionId: string, 
  userId?: string
): Promise<{
  agentHistory: AgentInteraction[];
  preferences: ChatSettings;
  analytics: any;
}> {
  const result = await manageCrossSessionMemory({
    action: 'load',
    sessionId,
    targetSessionId,
    userId
  }) as CrossSessionLoadResponse;
  
  return result.memory || { 
    agentHistory: [], 
    preferences: { crossSessionMemory: false, agentLock: false }, 
    analytics: {} 
  };
}

// Message Persistence API
export interface MessageBatch {
  messages: ChatMessage[];
  batchId: string;
  totalBatches: number;
  currentBatch: number;
  compressed?: boolean;
}

export async function saveMessagesToRemote(
  sessionId: string, 
  messages: ChatMessage[]
): Promise<{
  sessionId: string;
  messagesSaved: number;
  success: boolean;
}> {
  try {
    const response = await axios.post(`/api/chats/${sessionId}/messages`, {
      messages
    });
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to save messages: ${error.response?.data?.error || error.message}`);
  }
}

export async function loadMessagesFromRemote(
  sessionId: string,
  options?: {
    limit?: number;
    offset?: number;
    compressed?: boolean;
  }
): Promise<{
  sessionId: string;
  messages: ChatMessage[];
  totalMessages: number;
  hasMore: boolean;
}> {
  try {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.compressed) params.append('compressed', 'true');

    const response = await axios.get(`/api/chats/${sessionId}/messages?${params}`);
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to load messages: ${error.response?.data?.error || error.message}`);
  }
}

export async function syncMessagesWithRemote(
  sessionId: string,
  localMessages: ChatMessage[]
): Promise<{
  sessionId: string;
  mergedMessages: ChatMessage[];
  conflicts: ChatMessage[];
  syncedCount: number;
}> {
  try {
    const response = await axios.post(`/api/chats/${sessionId}/messages/sync`, {
      localMessages
    });
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to sync messages: ${error.response?.data?.error || error.message}`);
  }
} 