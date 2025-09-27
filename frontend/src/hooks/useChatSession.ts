import { useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  getCurrentSession,
  setCurrentSession,
  clearCurrentSession,
  addToPreviousSessions,
  generateSessionTitle,
  type StoredSession
} from '../utils/localStorage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export interface ChatSession {
  sessionId: string;
  title: string;
  createdAt: string;
  lastActivity: string;
  messageCount: number;
  isActive: boolean;
}

export interface Message {
  messageId: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: string;
}

export const useChatSession = () => {
  const [currentSession, setCurrentSessionState] = useState<ChatSession | null>(null);
  const [isViewingOldChat, setIsViewingOldChat] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const createNewSession = useCallback(async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/sessions`, {});
      const now = new Date().toISOString();
      
      const newSession: ChatSession = {
        sessionId: response.data.sessionId,
        title: 'New Chat',
        createdAt: response.data.createdAt || now,
        lastActivity: now,
        messageCount: 0,
        isActive: true
      };

      // Save to localStorage as current session
      const storedSession: StoredSession = {
        sessionId: newSession.sessionId,
        title: newSession.title,
        createdAt: newSession.createdAt,
        lastActivity: newSession.lastActivity,
        messageCount: 0
      };
      setCurrentSession(storedSession);

      setCurrentSessionState(newSession);
      setIsViewingOldChat(false);
      setSessionError(false);
      
      // Show success toast only if this was a retry
      if (sessionError) {
        toast.success('Connected!', {
          description: 'Successfully connected to the AI service.',
        });
      }

      return newSession;
    } catch (error) {
      console.error('Failed to create session:', error);
      toast.error('Connection Failed', {
        description: 'Unable to connect to server. Please check your connection and try again.',
        action: {
          label: 'Retry',
          onClick: () => {
            setSessionError(false);
            createNewSession();
          },
        },
      });
      setSessionError(true);
      throw error;
    }
  }, [sessionError]);

  const loadSessionFromStorage = useCallback(async () => {
    const storedSession = getCurrentSession();
    if (storedSession) {
      const sessionData: ChatSession = {
        ...storedSession,
        isActive: true
      };
      setCurrentSessionState(sessionData);
      setIsViewingOldChat(false);
      return sessionData;
    }
    return null;
  }, []);

  const updateSessionTitle = useCallback((message: string, messageCount: number) => {
    if (!currentSession) return;

    const now = new Date().toISOString();
    let newTitle = currentSession.title;
    
    // Update title if it's the first message
    if (messageCount === 1) {
      newTitle = generateSessionTitle(message);
    }

    const updatedSession: ChatSession = {
      ...currentSession,
      title: newTitle,
      lastActivity: now,
      messageCount
    };
    setCurrentSessionState(updatedSession);
    
    // Update localStorage
    setCurrentSession({
      sessionId: currentSession.sessionId,
      title: newTitle,
      createdAt: currentSession.createdAt,
      lastActivity: now,
      messageCount
    });

    return updatedSession;
  }, [currentSession]);

  const updateSessionActivity = useCallback((timestamp: string, messageCount: number) => {
    if (!currentSession) return;

    const updatedSession: ChatSession = {
      ...currentSession,
      lastActivity: timestamp,
      messageCount
    };
    setCurrentSessionState(updatedSession);
    
    setCurrentSession({
      sessionId: currentSession.sessionId,
      title: currentSession.title,
      createdAt: currentSession.createdAt,
      lastActivity: timestamp,
      messageCount
    });

    return updatedSession;
  }, [currentSession]);

  const resetSession = useCallback(async (messages: Message[]) => {
    if (!currentSession || isResetting) return;

    setIsResetting(true);

    try {
      // Save current session to previous sessions before resetting
      if (messages.length > 0) {
        const sessionToSave: StoredSession = {
          sessionId: currentSession.sessionId,
          title: currentSession.title,
          createdAt: currentSession.createdAt,
          lastActivity: currentSession.lastActivity,
          messageCount: messages.length
        };
        addToPreviousSessions(sessionToSave);
      }

      // Try to reset session on backend
      try {
        await axios.delete(`${API_BASE_URL}/sessions/${currentSession.sessionId}`);
      } catch (error) {
        console.error('Failed to reset session on backend:', error);
      }

      // Clear current session from localStorage
      clearCurrentSession();
      
      // Create new session
      await createNewSession();
    } catch (error) {
      console.error('Failed to reset session:', error);
      // Still create new session even if reset fails
      await createNewSession();
    } finally {
      setIsResetting(false);
    }
  }, [currentSession, isResetting, createNewSession]);

  const loadOldSession = useCallback((sessionData: ChatSession) => {
    setCurrentSessionState(sessionData);
    setIsViewingOldChat(true);
  }, []);

  const backToCurrentSession = useCallback(async () => {
    const storedSession = getCurrentSession();
    if (storedSession) {
      const sessionData: ChatSession = {
        ...storedSession,
        isActive: true
      };
      setCurrentSessionState(sessionData);
      setIsViewingOldChat(false);
      return sessionData;
    } else {
      return await createNewSession();
    }
  }, [createNewSession]);

  return {
    // State
    currentSession,
    isViewingOldChat,
    sessionError,
    isResetting,
    
    // Actions
    createNewSession,
    loadSessionFromStorage,
    updateSessionTitle,
    updateSessionActivity,
    resetSession,
    loadOldSession,
    backToCurrentSession,
    setSessionError
  };
};
