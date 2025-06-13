import axios from 'axios';

export async function sendChatMessage(message: string): Promise<string> {
  try {
    const response = await axios.post('/api/chat', { message });
    return response.data.message;
  } catch (error: any) {
    return 'Sorry, there was an error contacting the chat server.';
  }
} 