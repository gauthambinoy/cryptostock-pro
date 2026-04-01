import { authService } from './AuthService';

const apiClient = authService.getApiClient();

export interface Message {
  id: string;
  conversationId: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export const chatService = {
  async getConversations(): Promise<Conversation[]> {
    try {
      const response = await apiClient.get('/chat/conversations');
      return response.data.conversations;
    } catch (error) {
      throw new Error('Failed to fetch conversations');
    }
  },

  async getConversation(conversationId: string): Promise<Conversation> {
    try {
      const response = await apiClient.get(`/chat/conversations/${conversationId}`);
      return response.data.conversation;
    } catch (error) {
      throw new Error('Failed to fetch conversation');
    }
  },

  async createConversation(title: string): Promise<Conversation> {
    try {
      const response = await apiClient.post('/chat/conversations', { title });
      return response.data.conversation;
    } catch (error) {
      throw new Error('Failed to create conversation');
    }
  },

  async sendMessage(conversationId: string, content: string): Promise<Message[]> {
    try {
      const response = await apiClient.post(`/chat/conversations/${conversationId}/messages`, {
        content,
      });
      return response.data.messages;
    } catch (error) {
      throw new Error('Failed to send message');
    }
  },

  async deleteConversation(conversationId: string) {
    try {
      await apiClient.delete(`/chat/conversations/${conversationId}`);
    } catch (error) {
      throw new Error('Failed to delete conversation');
    }
  },

  async updateConversationTitle(conversationId: string, title: string) {
    try {
      const response = await apiClient.put(`/chat/conversations/${conversationId}`, { title });
      return response.data.conversation;
    } catch (error) {
      throw new Error('Failed to update conversation title');
    }
  },

  async getAIResponse(conversationId: string, userMessage: string): Promise<string> {
    try {
      const response = await apiClient.post(`/chat/ai-response`, {
        conversationId,
        message: userMessage,
      });
      return response.data.response;
    } catch (error) {
      throw new Error('Failed to get AI response');
    }
  },
};
