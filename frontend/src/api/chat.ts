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
  options?: { 
    signal?: AbortSignal; 
    activeSessionId?: string;
    slashCommand?: {
      command: string;
      agentType: string;
    };
  }
): Promise<ChatResponse> {
  try {
    const requestData: any = { 
      message,
      sessionId: sessionId || 'default',
      activeSessionId: options?.activeSessionId
    };
    
    // Add slash command metadata if present
    if (options?.slashCommand) {
      requestData.slashCommand = options.slashCommand;
    }
    
    const response = await axios.post('/api/chat', requestData, {
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
  sender?: 'user' | 'bot'; // Added to match backend response
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

export async function getChatHistory(
  sessionId: string, 
  options?: { limit?: number; offset?: number }
): Promise<{
  sessionId: string;
  messages: ChatMessage[];
  messageCount: number;
  totalMessages: number;
  hasMore: boolean;
  agentHistory: AgentInteraction[];
  toolsUsed: ToolUsage[];
  analytics: any;
}> {
  try {
    // Build URL with pagination parameters
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    
    const url = `/api/chats/${sessionId}/messages${params.toString() ? '?' + params.toString() : ''}`;
    console.log(`[getChatHistory] Requesting URL: ${url}`);
    const response = await axios.get(url);
    
    // Transform the response to match the expected format
    return {
      sessionId: response.data.sessionId,
      messages: response.data.messages || [],
      messageCount: response.data.messages?.length || 0, // Count of messages in this response
      totalMessages: response.data.totalMessages || response.data.messages?.length || 0, // Total count in backend
      hasMore: response.data.hasMore || false,
      agentHistory: [], // Not provided by messages endpoint
      toolsUsed: [], // Not provided by messages endpoint
      analytics: {} // Not provided by messages endpoint
    };
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


// Chat Management API
export interface ChatMetadata {
  id: string;
  title: string;
  createdAt: Date;
  lastMessageAt: Date;
  messageCount: number;
  unreadCount?: number;
  lastReadAt?: Date | null;
}

export async function getAllChats(): Promise<{
  chats: ChatMetadata[];
  totalChats: number;
}> {
  try {
    const response = await axios.get('/api/chats');
    console.log('[API] getAllChats response:', response.data);
    
    const result = {
      ...response.data,
      chats: response.data.chats.map((chat: any) => ({
        ...chat,
        createdAt: new Date(chat.createdAt || chat.timestamp),
        lastMessageAt: new Date(chat.lastMessageAt || chat.timestamp),
        unreadCount: chat.unreadCount || 0,
        lastReadAt: chat.lastReadAt ? new Date(chat.lastReadAt) : null
      }))
    };
    
    console.log('[API] getAllChats processed:', result);
    return result;
  } catch (error: any) {
    throw new Error(`Failed to get chats: ${error.response?.data?.error || error.message}`);
  }
}


export async function deleteChat(chatId: string): Promise<{
  success: boolean;
  chatId: string;
}> {
  try {
    const response = await axios.delete(`/api/chats/${chatId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to delete chat: ${error.response?.data?.error || error.message}`);
  }
}

export async function markChatAsRead(chatId: string): Promise<{
  success: boolean;
  sessionId: string;
  unreadCount: number;
  lastReadAt: string;
}> {
  try {
    const response = await axios.patch(`/api/chats/${chatId}/read`);
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to mark chat as read: ${error.response?.data?.error || error.message}`);
  }
}

export async function createChat(data: {
  title?: string;
  userId?: string;
  metadata?: any;
}): Promise<{
  success: boolean;
  sessionId: string;
  session: {
    id: string;
    title: string;
    createdAt: string;
    status: string;
    messageCount: number;
  };
}> {
  try {
    const response = await axios.post('/api/chats', data);
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to create chat: ${error.response?.data?.error || error.message}`);
  }
}

// Streaming chat interface
export interface StreamingChatCallbacks {
  onStart?: (data: { agent?: string; sessionId: string }) => void;
  onToken?: (token: string) => void;
  onStatus?: (data: { type: string; message: string; metadata?: any }) => void;
  onDone?: (data: { agent?: string; orchestration?: any }) => void;
  onError?: (error: Error) => void;
}

export interface StreamController {
  abort: () => void;
}

export function sendChatMessageStream(
  message: string,
  sessionId?: string,
  options?: {
    activeSessionId?: string;
    slashCommand?: {
      command: string;
      agentType: string;
    };
    callbacks: StreamingChatCallbacks;
  }
): StreamController {
  const abortController = new AbortController();
  
  // Send the initial request
  const requestData: any = {
    message,
    sessionId: sessionId || 'default',
    activeSessionId: options?.activeSessionId
  };
  
  if (options?.slashCommand) {
    requestData.slashCommand = options.slashCommand;
  }
  
  // Use fetch to send POST with body to SSE endpoint
  console.log('[sendChatMessageStream] Sending request to /api/chat/stream:', requestData);
  console.log('[sendChatMessageStream] Full URL:', window.location.origin + '/api/chat/stream');
  console.log('[sendChatMessageStream] Callbacks provided:', {
    onStart: !!options?.callbacks.onStart,
    onToken: !!options?.callbacks.onToken,
    onStatus: !!options?.callbacks.onStatus,
    onDone: !!options?.callbacks.onDone,
    onError: !!options?.callbacks.onError
  });
  
  fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData),
    signal: abortController.signal,
  }).then(response => {
    console.log('[sendChatMessageStream] Response received:', response.status, response.headers.get('content-type'));
    console.log('[sendChatMessageStream] Response ok:', response.ok);
    console.log('[sendChatMessageStream] Response body:', response.body);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    const processChunk = async () => {
      if (!reader) return;
      
      try {
        const { done, value } = await reader.read();
        if (done) {
          console.log('[Streaming] Stream ended (done=true)');
          return;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        console.log('[Streaming] Chunk received:', chunk.length, 'bytes');
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        console.log('[Streaming] Processing', lines.length, 'lines');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          console.log('[Streaming] Line:', line);
          if (line.startsWith('event: ')) {
            const event = line.slice(7);
            // Look for the next data line
            let dataLine = '';
            for (let j = i + 1; j < lines.length; j++) {
              if (lines[j].trim().startsWith('data: ')) {
                dataLine = lines[j].trim();
                i = j; // Skip the data line in the outer loop
                break;
              }
            }
            
            if (dataLine) {
              try {
                const data = JSON.parse(dataLine.slice(6));
                
                switch (event) {
                  case 'connected':
                    console.log('[Streaming] Connected to stream:', data);
                    break;
                  case 'start':
                    options?.callbacks.onStart?.(data);
                    break;
                  case 'token':
                    // Skip empty tokens
                    if (data.content) {
                      options?.callbacks.onToken?.(data.content);
                    }
                    break;
                  case 'status':
                    options?.callbacks.onStatus?.(data);
                    break;
                  case 'done':
                    options?.callbacks.onDone?.(data);
                    return; // Stop processing
                  case 'error':
                    options?.callbacks.onError?.(new Error(data.message));
                    return; // Stop processing
                }
              } catch (parseError) {
                console.error('[Streaming] Error parsing data:', parseError, dataLine);
              }
            }
          }
        }
        
        // Continue reading
        processChunk();
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('[Streaming] Request aborted');
        } else {
          console.error('[Streaming] Error processing chunk:', error);
          console.error('[Streaming] Chunk processing error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            lastLine: lines[lines.length - 1],
            buffer: buffer
          });
          options?.callbacks.onError?.(error as Error);
        }
      }
    };
    
    processChunk();
  }).catch(error => {
    if (error.name === 'AbortError') {
      console.log('[Streaming] Request aborted');
    } else {
      console.error('[Streaming] Failed to connect:', error);
      console.error('[Streaming] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      options?.callbacks.onError?.(error);
    }
  });
  
  return {
    abort: () => abortController.abort()
  };
} 