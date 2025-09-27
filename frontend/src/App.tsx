import { useEffect, useRef } from 'react';
import { PromptInputBox } from './components/ui/ai-prompt-box';
import { MessageSquare, RotateCcw, Clock, X, Heart } from 'lucide-react';
import { renderMarkdown } from './utils/markdown';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { ThinkingIndicator } from './components/ThinkingIndicator';
import { ServerWarmingScreen } from './components/ServerWarmingScreen';
import { useServerStatus } from './hooks/useServerStatus';
import { useChatSession } from './hooks/useChatSession';
import { useMessages } from './hooks/useMessages';
import { usePreviousSessions } from './hooks/usePreviousSessions';
import { cleanupOldSessions } from './utils/localStorage';

function App() {
  // Server status check
  const { status: serverStatus, isReady: serverReady, error: serverError, warmingProgress, retryConnection } = useServerStatus();
  
  // Custom hooks
  const {
    currentSession,
    isViewingOldChat,
    sessionError,
    isResetting,
    createNewSession,
    loadSessionFromStorage,
    updateSessionTitle,
    updateSessionActivity,
    resetSession,
    loadOldSession,
    backToCurrentSession
  } = useChatSession();

  const {
    messages,
    isLoading,
    isTyping,
    loadSessionMessages,
    sendMessage,
    clearMessages,
    setMessagesFromHistory
  } = useMessages();

  const {
    showPreviousChats,
    previousSessions,
    loadingSessions,
    loadingChatId,
    loadChatHistory,
    handleShowPreviousChats,
    handleClosePreviousChats
  } = usePreviousSessions();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Initialize app - load existing session or create new one (only after server is ready)
  useEffect(() => {
    if (!serverReady) return;

    const initializeApp = async () => {
      // Cleanup old sessions on startup
      cleanupOldSessions();

      // Try to load existing current session
      const sessionData = await loadSessionFromStorage();
      if (sessionData) {
        // Load messages from API
        await loadSessionMessages(sessionData.sessionId, true);
      } else {
        // Create new session
        await createNewSession();
      }
    };

    initializeApp();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverReady]);

  // Handle sending messages
  const handleSend = async (message: string) => {
    if (!currentSession) {
      toast.error('No Active Session', {
        description: 'Please refresh the page to create a new session.',
      });
      return;
    }
    
    if (isViewingOldChat) {
      toast.warning('Viewing Old Chat', {
        description: 'Please start a new chat to send messages.',
      });
      return;
    }

    // Update session title if it's the first message
    if (messages.length === 0) {
      updateSessionTitle(message, 1);
    }

    const result = await sendMessage(
      message,
      currentSession,
      createNewSession
    );

    if (result) {
      // Update session activity
      updateSessionActivity(result.timestamp, messages.length + 2); // +2 for user and bot message
    }
  };

  // Handle reset session
  const handleReset = async () => {
    await resetSession(messages);
    clearMessages();
  };

  // Handle loading chat history
  const handleLoadChatHistory = async (sessionId: string) => {
    await loadChatHistory(sessionId, setMessagesFromHistory, loadOldSession);
  };

  // Handle back to current session
  const handleBackToCurrentSession = async () => {
    const sessionData = await backToCurrentSession();
    if (sessionData) {
      await loadSessionMessages(sessionData.sessionId, true);
    }
  };



  // Show server warming screen if server is not ready
  if (!serverReady) {
    return (
      <ServerWarmingScreen
        status={serverStatus}
        progress={warmingProgress}
        error={serverError}
        onRetry={retryConnection}
      />
    );
  }

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
            Confused by all the news out there? Just ask, we’ll summarize it for you.
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
          <div className="min-h-[300px] max-h-[400px] md:min-h-[350px] md:max-h-[500px] overflow-y-auto space-y-3 mb-4 md:mb-6 scrollbar-hide scroll-smooth">
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

                {/* Enhanced Thinking indicator */}
                {isTyping && <ThinkingIndicator />}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Box */}
          <div className={(isViewingOldChat || sessionError) ? 'opacity-50 pointer-events-none' : ''}>
            <PromptInputBox 
              onSend={handleSend}
              isLoading={isLoading}
              placeholder={
                sessionError 
                  ? "Connection failed - please retry" 
                  : isViewingOldChat 
                    ? "Cannot send messages in old conversations" 
                    : "Ask me anything about the news..."
              }
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="text-white/40 text-xs flex items-center justify-center gap-1">
            Made with <Heart size={12} className="text-red-400 animate-pulse" /> by{' '}
            <a 
              href="https://www.basith.me/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white/80 transition-colors underline"
            >
              basith
            </a>
          </div>
        </div>
      </div>

      {/* Previous Chats Modal */}
      {showPreviousChats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-black/20 via-black/30 to-black/40 backdrop-blur-sm"
            onClick={handleClosePreviousChats}
          />
          
          {/* Modal */}
          <div className="relative w-full max-w-md mx-auto bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-2xl" style={{ overflow: 'visible', margin: '0 16px' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Previous Chats</h2>
              <button
                onClick={handleClosePreviousChats}
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
                    onClick={() => loadingChatId !== session.sessionId && handleLoadChatHistory(session.sessionId)}
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
      
      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}

export default App;