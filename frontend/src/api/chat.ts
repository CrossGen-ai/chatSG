import axios from 'axios';

export async function sendChatMessage(
  message: string, 
  sessionId?: string, 
  options?: { signal?: AbortSignal }
): Promise<string> {
  try {
    const response = await axios.post('/api/chat', { 
      message,
      sessionId: sessionId || 'default'
    }, {
      signal: options?.signal
    });
    return response.data.message;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw error;
    }
    return 'Sorry, there was an error contacting the chat server.';
  }
} 