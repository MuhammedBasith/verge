import { useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { getPreviousSessions, type StoredSession } from '../utils/localStorage';
import type { ChatSession } from './useChatSession';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const usePreviousSessions = () => {
  const [showPreviousChats, setShowPreviousChats] = useState(false);
  const [previousSessions, setPreviousSessions] = useState<StoredSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);

  const loadPreviousSessions = useCallback(async () => {
    setLoadingSessions(true);
    
    try {
      // Load from localStorage first for immediate display
      const localSessions = getPreviousSessions();
      
      // Always load from API to get latest data
      const response = await axios.get(`${API_BASE_URL}/sessions?limit=20&offset=0`);
      const apiSessions = response.data.sessions;
      
      // Merge with local sessions (API sessions are persisted ones)
      const mergedSessions = [...localSessions];
      
      apiSessions.forEach((apiSession: { sessionId: string; title: string; createdAt: string }) => {
        const existingIndex = mergedSessions.findIndex(s => s.sessionId === apiSession.sessionId);
        if (existingIndex >= 0) {
          // Update existing session with API data
          mergedSessions[existingIndex] = {
            ...mergedSessions[existingIndex],
            title: apiSession.title,
            createdAt: apiSession.createdAt,
          };
        } else {
          // Add new session from API
          mergedSessions.push({
            sessionId: apiSession.sessionId,
            title: apiSession.title,
            createdAt: apiSession.createdAt,
            lastActivity: apiSession.createdAt,
            messageCount: 0
          });
        }
      });
      
      // Sort by creation date (newest first)
      mergedSessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setPreviousSessions(mergedSessions);
    } catch (error) {
      console.error('Failed to load sessions from API:', error);
      // Fallback to localStorage only
      const localSessions = getPreviousSessions();
      setPreviousSessions(localSessions);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const loadChatHistory = useCallback(async (
    sessionId: string,
    onLoadMessages: (messages: any[]) => void,
    onLoadOldSession: (session: ChatSession) => void
  ) => {
    try {
      setLoadingChatId(sessionId);
      
      // Always load from API
      const response = await axios.get(`${API_BASE_URL}/chat/history/${sessionId}`);
      
      const session = previousSessions.find(s => s.sessionId === sessionId);
      const chatSession: ChatSession = {
        sessionId: sessionId,
        title: session?.title || 'Old Chat',
        createdAt: session?.createdAt || '',
        lastActivity: session?.lastActivity || '',
        messageCount: response.data.messages.length,
        isActive: false
      };

      onLoadOldSession(chatSession);
      onLoadMessages(response.data.messages);
      setShowPreviousChats(false);
    } catch (error) {
      console.error('Failed to load chat history:', error);
      toast.error('Failed to Load Chat', {
        description: 'Unable to load chat history. Please try again.',
      });
    } finally {
      setLoadingChatId(null);
    }
  }, [previousSessions]);

  const handleShowPreviousChats = useCallback(() => {
    setShowPreviousChats(true);
    // Always refresh previous sessions data
    setPreviousSessions([]);
    loadPreviousSessions();
  }, [loadPreviousSessions]);

  const handleClosePreviousChats = useCallback(() => {
    setShowPreviousChats(false);
  }, []);

  return {
    // State
    showPreviousChats,
    previousSessions,
    loadingSessions,
    loadingChatId,
    
    // Actions
    loadPreviousSessions,
    loadChatHistory,
    handleShowPreviousChats,
    handleClosePreviousChats
  };
};
