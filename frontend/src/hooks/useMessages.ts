import { useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import type { Message, ChatSession } from './useChatSession';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const useMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const loadSessionMessages = useCallback(async (sessionId: string, isCurrentSession: boolean = false) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/chat/history/${sessionId}`);
      setMessages(response.data.messages);
      return response.data.messages;
    } catch (error) {
      console.error('Failed to load session messages:', error);
      if (isCurrentSession) {
        setMessages([]);
      }
      return [];
    }
  }, []);

  const handleGeminiError = useCallback((error: unknown) => {
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      
      switch (status) {
        case 429:
          toast.error('Rate Limit Exceeded', {
            description: 'Gemini API is temporarily overloaded. Please try again in a few moments.',
            action: {
              label: 'Retry',
              onClick: () => window.location.reload(),
            },
          });
          break;
          
        case 503:
          toast.error('Service Unavailable', {
            description: 'Gemini AI service is temporarily down. This is not an issue with our app.',
            action: {
              label: 'Retry',
              onClick: () => window.location.reload(),
            },
          });
          break;
          
        case 500:
          toast.error('AI Service Error', {
            description: 'Gemini AI encountered an internal error. Please try again.',
          });
          break;
          
        case 400:
          toast.error('Request Error', {
            description: 'Invalid request or Gemini billing issue. Please contact support if this persists.',
          });
          break;
          
        case 403:
          toast.error('Access Denied', {
            description: 'Gemini API access denied. This is a service configuration issue.',
          });
          break;
          
        case 404:
          toast.error('Resource Not Found', {
            description: 'Gemini model not available. Please try again later.',
          });
          break;
          
        case 504:
          toast.error('Request Timeout', {
            description: 'Gemini AI took too long to respond. Please try a shorter message.',
          });
          break;
          
        default:
          toast.error('AI Service Error', {
            description: `Gemini API error (${status}). This is not an issue with our app.`,
          });
      }
      
      // Add error message to chat
      const errorMessage: Message = {
        messageId: `error-${Date.now()}`,
        content: `I'm temporarily unable to respond due to an issue with the AI service. Please try again in a moment.\n\n*This is a Gemini AI service issue, not a problem with our application.*`,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
      
    } else {
      // Network or other errors
      toast.error('Connection Error', {
        description: 'Unable to reach the AI service. Please check your connection.',
      });
      
      const errorMessage: Message = {
        messageId: `error-${Date.now()}`,
        content: `I'm having trouble connecting to the AI service. Please check your internet connection and try again.`,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  }, []);

  const sendMessage = useCallback(async (
    message: string, 
    currentSession: ChatSession | null,
    onCreateNewSession: () => Promise<ChatSession>
  ) => {
    if (!currentSession) {
      toast.error('No Active Session', {
        description: 'Please refresh the page to create a new session.',
      });
      return;
    }

    const now = new Date().toISOString();
    
    // Add user message immediately to UI
    const userMessage: Message = {
      messageId: `temp-user-${Date.now()}`,
      content: message,
      sender: 'user',
      timestamp: now,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/chat`, {
        sessionId: currentSession.sessionId,
        message: message
      });

      // Replace temp user message and add bot response
      const actualUserMessage: Message = {
        messageId: `user-${Date.now()}`,
        content: message,
        sender: 'user',
        timestamp: now,
      };

      const botMessage: Message = {
        messageId: response.data.messageId,
        content: response.data.message,
        sender: 'assistant',
        timestamp: response.data.timestamp,
      };

      // Update messages with actual API response
      setMessages(prev => {
        const withoutTemp = prev.filter(msg => !msg.messageId.startsWith('temp-'));
        return [...withoutTemp, actualUserMessage, botMessage];
      });

      return {
        userMessage: actualUserMessage,
        botMessage,
        timestamp: response.data.timestamp
      };

    } catch (error: unknown) {
      console.error('Failed to send message:', error);
      
      // Handle different error cases
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          // Session not found, create new one
          toast.info('Session Expired', {
            description: 'Creating a new chat session.',
          });
          await onCreateNewSession();
        } else if (error.response?.status === 410) {
          // Session was reset
          toast.info('Session Reset', {
            description: 'This conversation has been saved. Starting a new chat.',
          });
          await onCreateNewSession();
        } else {
          // Handle Gemini API errors
          handleGeminiError(error);
        }
      } else {
        // Handle network or other errors
        handleGeminiError(error);
      }
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  }, [handleGeminiError]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const setMessagesFromHistory = useCallback((historyMessages: Message[]) => {
    setMessages(historyMessages);
  }, []);

  return {
    // State
    messages,
    isLoading,
    isTyping,
    
    // Actions
    loadSessionMessages,
    sendMessage,
    clearMessages,
    setMessagesFromHistory,
    handleGeminiError
  };
};
