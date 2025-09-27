import { useState, useEffect } from 'react';

const THINKING_MESSAGES = [
  "Thinking...",
  "Analyzing news...",
  "Processing information...",
  "Gathering insights...",
  "Connecting the dots...",
  "Summarizing findings...",
  "Almost ready...",
];

interface ThinkingIndicatorProps {
  className?: string;
}

export const ThinkingIndicator = ({ className = "" }: ThinkingIndicatorProps) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % THINKING_MESSAGES.length);
    }, 1500); // Change message every 1.5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex justify-start mb-3 ${className}`}>
      <div className="bg-black/20 text-white rounded-2xl rounded-bl-md backdrop-blur-sm border border-white/20 px-4 py-3">
        <div className="flex items-center space-x-1">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
          <span 
            key={currentMessageIndex} 
            className="text-xs text-white/60 ml-2 animate-fade-in"
          >
            {THINKING_MESSAGES[currentMessageIndex]}
          </span>
        </div>
      </div>
    </div>
  );
};
