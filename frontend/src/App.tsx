import { useState, useEffect, useRef } from 'react';
import { PromptInputBox } from './components/ui/ai-prompt-box';
import { MessageSquare, RotateCcw, Clock, X } from 'lucide-react';
import axios from 'axios';
import { renderMarkdown } from './utils/markdown';
import {
  getCurrentSession,
  setCurrentSession,
  clearCurrentSession,
  getPreviousSessions,
  addToPreviousSessions,
  generateSessionTitle,
  cleanupOldSessions,
  type StoredSession
} from './utils/localStorage';

const API_BASE_URL = 'http://localhost:3000/api';

interface Message {
  messageId: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: string;
}

interface ChatSession {
  sessionId: string;
  title: string;
  createdAt: string;
  lastActivity: string;
  messageCount: number;
  isActive: boolean; // true for current session, false for previous
}

function App() {
  const [currentSession, setCurrentSessionState] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showPreviousChats, setShowPreviousChats] = useState(false);
  const [previousSessions, setPreviousSessions] = useState<StoredSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);
  const [isViewingOldChat, setIsViewingOldChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Initialize app - load existing session or create new one
  useEffect(() => {
    const initializeApp = async () => {
      // Cleanup old sessions on startup
      cleanupOldSessions();

      // Try to load existing current session
      const storedSession = getCurrentSession();
      if (storedSession) {
        // Load existing session
        const sessionData: ChatSession = {
          ...storedSession,
          isActive: true
        };
        setCurrentSessionState(sessionData);
        
        // Load messages from API
        await loadSessionMessages(storedSession.sessionId, true);
        setIsViewingOldChat(false);
      } else {
        // Create new session
        await createNewSession();
      }
    };

    initializeApp();
  }, []);

  // Load messages for a session via API
  const loadSessionMessages = async (sessionId: string, isCurrentSession: boolean = false) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/chat/history/${sessionId}`);
      setMessages(response.data.messages);
      
      // Update message count in localStorage if it's current session
      if (isCurrentSession) {
        const storedSession = getCurrentSession();
        if (storedSession) {
          setCurrentSession({
            ...storedSession,
            messageCount: response.data.messages.length
          });
        }
      }
    } catch (error) {
      console.error('Failed to load session messages:', error);
      if (isCurrentSession) {
        // If current session messages can't be loaded, start fresh
        setMessages([]);
      }
    }
  };

  const createNewSession = async () => {
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
      setMessages([]);
      setIsViewingOldChat(false);
    } catch (error) {
      console.error('Failed to create session:', error);
      // Fallback: create offline session
      const fallbackSession: ChatSession = {
        sessionId: `offline-${Date.now()}`,
        title: 'New Chat (Offline)',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        messageCount: 0,
        isActive: true
      };
      setCurrentSessionState(fallbackSession);
    }
  };

  const handleSend = async (message: string) => {
    if (!currentSession || isViewingOldChat) return;

    const now = new Date().toISOString();
    
    // Add user message immediately to UI
    const userMessage: Message = {
      messageId: `temp-user-${Date.now()}`,
      content: message,
      sender: 'user',
      timestamp: now,
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Update session title if it's the first message
    if (messages.length === 0) {
      const newTitle = generateSessionTitle(message);
      const updatedSession: ChatSession = {
        ...currentSession,
        title: newTitle,
        lastActivity: now,
        messageCount: 1
      };
      setCurrentSessionState(updatedSession);
      
      // Update localStorage
      setCurrentSession({
        sessionId: currentSession.sessionId,
        title: newTitle,
        createdAt: currentSession.createdAt,
        lastActivity: now,
        messageCount: 1
      });
    }

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
      
      // Update session info in localStorage
      const updatedMessageCount = messages.length + 1; // +1 for the pair
      const updatedSession: ChatSession = {
        ...currentSession,
        lastActivity: response.data.timestamp,
        messageCount: updatedMessageCount
      };
      setCurrentSessionState(updatedSession);
      
      setCurrentSession({
        sessionId: currentSession.sessionId,
        title: currentSession.title,
        createdAt: currentSession.createdAt,
        lastActivity: response.data.timestamp,
        messageCount: updatedMessageCount
      });

    } catch (error: unknown) {
      console.error('Failed to send message:', error);
      
      // Handle different error cases
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          // Session not found, create new one
          await createNewSession();
        } else if (error.response?.status === 410) {
          // Session was reset
          alert('This conversation has been saved and reset. Starting a new chat.');
          await createNewSession();
        } else {
          // Generic error - add error message
          const errorMessage: Message = {
            messageId: `error-${Date.now()}`,
            content: "Sorry, I couldn't process your request. Please try again.\n\nHere's an example of how I format responses:\n\n* **News Analysis:** I can provide structured summaries with bullet points and **bold formatting** for key information.",
            sender: 'assistant',
            timestamp: new Date().toISOString(),
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      } else {
        // Non-axios error
        const errorMessage: Message = {
          messageId: `error-${Date.now()}`,
          content: "Sorry, I couldn't process your request. Please try again.\n\nHere's an example of how I format responses:\n\n* **Breaking News:** I analyze current events with clear formatting\n* **Key Points:** Important information is **highlighted** for easy reading",
          sender: 'assistant',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleReset = async () => {
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

      // Try to reset session on backend (this saves it to DB and clears from Redis)
      try {
        await axios.delete(`${API_BASE_URL}/sessions/${currentSession.sessionId}`);
      } catch (error) {
        console.error('Failed to reset session on backend:', error);
        // Continue with local reset even if backend fails
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
  };

  const loadPreviousSessions = async () => {
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
  };

  const loadChatHistory = async (sessionId: string) => {
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

      setCurrentSessionState(chatSession);
      setMessages(response.data.messages);
      setIsViewingOldChat(true);
      setShowPreviousChats(false);
    } catch (error) {
      console.error('Failed to load chat history:', error);
      alert('Failed to load chat history. Please try again.');
    } finally {
      setLoadingChatId(null);
    }
  };

  const handleShowPreviousChats = () => {
    setShowPreviousChats(true);
    // Always refresh previous sessions data
    setPreviousSessions([]);
    loadPreviousSessions();
  };

  const handleBackToCurrentSession = async () => {
    // Check if we have a current session in localStorage
    const storedSession = getCurrentSession();
    if (storedSession) {
      // Load current session
      const sessionData: ChatSession = {
        ...storedSession,
        isActive: true
      };
      setCurrentSessionState(sessionData);
      
      // Load messages from API
      await loadSessionMessages(storedSession.sessionId, true);
      setIsViewingOldChat(false);
    } else {
      // Create new session
      await createNewSession();
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(125%_125%_at_50%_101%,rgba(245,87,2,1)_10.5%,rgba(245,120,2,1)_16%,rgba(245,140,2,1)_17.5%,rgba(245,170,100,1)_25%,rgba(238,174,202,1)_40%,rgba(202,179,214,1)_65%,rgba(148,201,233,1)_100%)] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 
            className="text-5xl font-normal mb-4 text-white"
            style={{ fontFamily: '"Instrument Serif", serif' }}
          >
            Verge
          </h1>
          <p className="text-white/70 text-base max-w-md mx-auto leading-relaxed mb-6">
            Confused by all the news out there? Just ask, we'll summarize it for you.
          </p>
          
          <div className="flex justify-center gap-4 mb-8">
            <button 
              onClick={handleShowPreviousChats}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors duration-200"
            >
              <MessageSquare size={16} />
              Previous Chats
            </button>
            
            <button
              onClick={handleReset}
              disabled={!currentSession || messages.length === 0 || isResetting}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResetting ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white/70 rounded-full"></div>
                  Resetting...
                </>
              ) : (
                <>
                  <RotateCcw size={16} />
                  Reset Session
                </>
              )}
            </button>
          </div>

          {/* Current session indicator */}
          {isViewingOldChat && currentSession && (
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/80 text-sm">
                <Clock size={14} />
                Viewing: {currentSession.title}
                <button
                  onClick={handleBackToCurrentSession}
                  className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors"
                  title="Back to current chat"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Chat Container */}
        <div className={`bg-black/10 backdrop-blur-sm border border-white/20 rounded-3xl p-4 md:p-6 shadow-2xl ${isViewingOldChat ? 'opacity-90' : ''}`}>
          {/* Messages Area */}
          <div className="min-h-[350px] max-h-[450px] md:min-h-[400px] md:max-h-[500px] overflow-y-auto space-y-3 mb-4 md:mb-6 scrollbar-hide scroll-smooth">
            {messages.length === 0 ? (
              <div className="text-center text-white/60 py-20">
                <p className="text-lg mb-2">Start a conversation</p>
                <p className="text-sm">Ask me anything about the news</p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div key={message.messageId} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
                    <div
                      className={`
                        max-w-[85%] md:max-w-[80%] px-3 py-2.5 md:px-4 md:py-3 rounded-2xl shadow-lg
                        ${message.sender === 'user'
                          ? 'bg-white/90 text-gray-800 rounded-br-md backdrop-blur-sm' 
                          : 'bg-black/20 text-white rounded-bl-md backdrop-blur-sm border border-white/20'
                        }
                      `}
                    >
                      <div className="text-sm leading-relaxed">
                        {message.sender === 'assistant' ? 
                          renderMarkdown(message.content) : 
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        }
                      </div>
                      <div className={`text-xs mt-2 opacity-60 ${message.sender === 'user' ? 'text-gray-600' : 'text-white/60'}`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex justify-start mb-3">
                    <div className="bg-black/20 text-white rounded-2xl rounded-bl-md backdrop-blur-sm border border-white/20 px-4 py-3">
                      <div className="flex items-center space-x-1">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        <span className="text-xs text-white/60 ml-2">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Box */}
          <div className={isViewingOldChat ? 'opacity-50 pointer-events-none' : ''}>
            <PromptInputBox 
              onSend={handleSend}
              isLoading={isLoading}
              placeholder={isViewingOldChat ? "Cannot send messages in old conversations" : "Ask me anything about the news..."}
            />
          </div>
        </div>
      </div>

      {/* Previous Chats Modal */}
      {showPreviousChats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-black/20 via-black/30 to-black/40 backdrop-blur-sm"
            onClick={() => setShowPreviousChats(false)}
          />
          
          {/* Modal */}
          <div className="relative w-full max-w-md mx-auto bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-2xl" style={{ overflow: 'visible', margin: '0 16px' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Previous Chats</h2>
              <button
                onClick={() => setShowPreviousChats(false)}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-hide scroll-smooth px-1" style={{ margin: '0 -4px', padding: '0 4px' }}>
              {loadingSessions ? (
                <div className="text-center text-white/60 py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full mx-auto mb-4"></div>
                  <p>Loading conversations...</p>
                </div>
              ) : previousSessions.length === 0 ? (
                <div className="text-center text-white/60 py-12">
                  <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-base mb-2">No previous chats</p>
                  <p className="text-sm opacity-75">Start a conversation to see your chat history here</p>
                </div>
              ) : (
                previousSessions.map((session) => (
                  <div
                    key={session.sessionId}
                    onClick={() => loadingChatId !== session.sessionId && loadChatHistory(session.sessionId)}
                    className={`p-4 bg-white/5 border border-white/10 rounded-2xl transition-all duration-200 ${
                      loadingChatId === session.sessionId 
                        ? 'cursor-wait opacity-75' 
                        : 'cursor-pointer hover:bg-white/10 hover:scale-[1.02] hover:shadow-xl hover:border-white/30'
                    }`}
                    style={{ transformOrigin: 'center', margin: '2px' }}
                  >
                    {loadingChatId === session.sessionId ? (
                      <div className="flex items-center justify-center py-2">
                        <div className="animate-spin w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full mr-3"></div>
                        <span className="text-white/80 text-sm">Loading conversation...</span>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-white font-medium text-sm mb-2 truncate">
                          {session.title}
                        </h3>
                        <div className="flex justify-between items-center">
                          <p className="text-white/60 text-xs">
                            {new Date(session.createdAt).toLocaleDateString()} at{' '}
                            {new Date(session.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {session.messageCount > 0 && (
                            <span className="text-white/40 text-xs">
                              {session.messageCount} messages
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
    </div>
      )}
    </div>
  );
}

export default App;