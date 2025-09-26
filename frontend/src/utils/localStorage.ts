// localStorage utility for managing sessions only (no message caching)

const STORAGE_KEYS = {
  CURRENT_SESSION: 'verge_current_session',
  PREVIOUS_SESSIONS: 'verge_previous_sessions',
} as const;

export interface StoredSession {
  sessionId: string;
  title: string;
  createdAt: string;
  lastActivity: string;
  messageCount: number;
}

// Current session management
export const getCurrentSession = (): StoredSession | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error loading current session:', error);
    return null;
  }
};

export const setCurrentSession = (session: StoredSession): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(session));
  } catch (error) {
    console.error('Error saving current session:', error);
  }
};

export const clearCurrentSession = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
  } catch (error) {
    console.error('Error clearing current session:', error);
  }
};

// Previous sessions management
export const getPreviousSessions = (): StoredSession[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PREVIOUS_SESSIONS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading previous sessions:', error);
    return [];
  }
};

export const addToPreviousSessions = (session: StoredSession): void => {
  try {
    const existing = getPreviousSessions();
    const updated = [session, ...existing.filter(s => s.sessionId !== session.sessionId)]
      .slice(0, 50); // Keep only last 50 sessions
    localStorage.setItem(STORAGE_KEYS.PREVIOUS_SESSIONS, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving to previous sessions:', error);
  }
};

export const updatePreviousSession = (sessionId: string, updates: Partial<StoredSession>): void => {
  try {
    const sessions = getPreviousSessions();
    const updated = sessions.map(session => 
      session.sessionId === sessionId ? { ...session, ...updates } : session
    );
    localStorage.setItem(STORAGE_KEYS.PREVIOUS_SESSIONS, JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating previous session:', error);
  }
};

// Utility functions
export const generateSessionTitle = (firstMessage: string): string => {
  const cleaned = firstMessage.trim();
  if (cleaned.length <= 50) return cleaned;
  return cleaned.substring(0, 47) + '...';
};

export const updateSessionActivity = (sessionId: string): void => {
  // Update current session
  const currentSession = getCurrentSession();
  if (currentSession && currentSession.sessionId === sessionId) {
    setCurrentSession({
      ...currentSession,
      lastActivity: new Date().toISOString()
    });
  }

  // Update in previous sessions if exists
  updatePreviousSession(sessionId, {
    lastActivity: new Date().toISOString()
  });
};

// Cleanup old sessions (call periodically)
export const cleanupOldSessions = (): void => {
  try {
    const sessions = getPreviousSessions();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Keep sessions from last week
    const recentSessions = sessions.filter(session => 
      new Date(session.lastActivity) > oneWeekAgo
    );

    // Update previous sessions
    localStorage.setItem(STORAGE_KEYS.PREVIOUS_SESSIONS, JSON.stringify(recentSessions));
  } catch (error) {
    console.error('Error cleaning up old sessions:', error);
  }
};