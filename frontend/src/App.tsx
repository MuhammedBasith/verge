import { useState, useEffect, useRef } from 'react';
import { PromptInputBox } from './components/ui/ai-prompt-box';
import { MessageSquare, RotateCcw } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [showPreviousChats, setShowPreviousChats] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = (message: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      isUser: true,
      timestamp: new Date(),
    };

    // Add bot response immediately
    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: "I'm a dummy response! This is where your RAG-based news summarization would appear.",
      isUser: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage, botMessage]);
  };

  const handleReset = () => {
    setMessages([]);
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
              onClick={() => setShowPreviousChats(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors duration-200"
            >
              <MessageSquare size={16} />
              Previous Chats
            </button>
            
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors duration-200"
            >
              <RotateCcw size={16} />
              Reset Session
            </button>
          </div>
        </div>

        {/* Chat Container */}
        <div className="bg-black/10 backdrop-blur-sm border border-white/20 rounded-3xl p-4 md:p-6 shadow-2xl">
          {/* Messages Area */}
          <div className="min-h-[250px] max-h-[350px] md:min-h-[300px] md:max-h-[400px] overflow-y-auto space-y-3 mb-4 md:mb-6 scrollbar-hide">
            {messages.length === 0 ? (
              <div className="text-center text-white/60 py-20">
                <p className="text-lg mb-2">Start a conversation</p>
                <p className="text-sm">Ask me anything about the news</p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-3`}>
                    <div
                      className={`
                        max-w-[85%] md:max-w-[80%] px-3 py-2.5 md:px-4 md:py-3 rounded-2xl shadow-lg
                        ${message.isUser 
                          ? 'bg-white/90 text-gray-800 rounded-br-md backdrop-blur-sm' 
                          : 'bg-black/20 text-white rounded-bl-md backdrop-blur-sm border border-white/20'
                        }
                      `}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                      <div className={`text-xs mt-2 opacity-60 ${message.isUser ? 'text-gray-600' : 'text-white/60'}`}>
                        {message.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Box */}
          <div>
            <PromptInputBox 
              onSend={handleSend}
              placeholder="Ask me anything about the news..."
            />
          </div>
        </div>
      </div>

      {/* Previous Chats Modal */}
      {showPreviousChats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-black/20 via-black/30 to-black/40 backdrop-blur-sm"
            onClick={() => setShowPreviousChats(false)}
          />
          
          {/* Modal */}
          <div className="relative w-full max-w-md mx-auto bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Previous Chats</h2>
              <button
                onClick={() => setShowPreviousChats(false)}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-hide">
              <div className="text-center text-white/60 py-12">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-base mb-2">No previous chats</p>
                <p className="text-sm opacity-75">Start a conversation to see your chat history here</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;