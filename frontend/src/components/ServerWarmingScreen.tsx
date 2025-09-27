import { RefreshCw, Zap, Heart } from 'lucide-react';
import type { ServerStatus } from '../hooks/useServerStatus';

interface ServerWarmingScreenProps {
  status: ServerStatus;
  progress: number;
  error: string | null;
  onRetry: () => void;
}

const getStatusMessage = (status: ServerStatus, progress: number) => {
  switch (status) {
    case 'checking':
      return 'Connecting to server...';
    case 'warming':
      if (progress < 30) return 'Waking up the server...';
      if (progress < 60) return 'Loading AI models...';
      if (progress < 90) return 'Almost ready...';
      return 'Finalizing setup...';
    case 'ready':
      return 'Connected successfully!';
    case 'error':
      return 'Connection failed';
    default:
      return 'Connecting...';
  }
};

const getStatusIcon = (status: ServerStatus) => {
  const logoClass = "w-8 h-8 opacity-70";
  
  switch (status) {
    case 'checking':
      return (
        <div className="relative">
          <img src="/logo.png" alt="Verge" className={`${logoClass} animate-pulse`} />
          <RefreshCw className="absolute inset-0 animate-spin opacity-50" size={32} />
        </div>
      );
    case 'warming':
      return (
        <div className="relative">
          <img src="/logo.png" alt="Verge" className={`${logoClass} animate-pulse`} />
          <Zap className="absolute -top-1 -right-1 animate-pulse text-orange-400" size={16} />
        </div>
      );
    case 'ready':
      return <img src="/logo.png" alt="Verge" className={`${logoClass} opacity-90`} />;
    case 'error':
      return <img src="/logo.png" alt="Verge" className={`${logoClass} opacity-40 grayscale`} />;
    default:
      return <img src="/logo.png" alt="Verge" className={`${logoClass} animate-pulse`} />;
  }
};

export const ServerWarmingScreen = ({ 
  status, 
  progress, 
  error, 
  onRetry 
}: ServerWarmingScreenProps) => {
  return (
    <div className="min-h-screen bg-[radial-gradient(125%_125%_at_50%_101%,rgba(245,87,2,1)_10.5%,rgba(245,120,2,1)_16%,rgba(245,140,2,1)_17.5%,rgba(245,170,100,1)_25%,rgba(238,174,202,1)_40%,rgba(202,179,214,1)_65%,rgba(148,201,233,1)_100%)] flex items-center justify-center p-6">
      <div className="w-full max-w-md mx-auto text-center">
        {/* Header */}
        <div className="mb-8">
          <h1 
            className="text-5xl font-normal mb-4 text-white"
            style={{ fontFamily: '"Instrument Serif", serif' }}
          >
            Verge
          </h1>
          <p className="text-white/70 text-base leading-relaxed">
            Confused by all the news out there? Just ask, we'll summarize it for you.
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-black/10 backdrop-blur-sm border border-white/20 rounded-3xl p-8 shadow-2xl">
          {/* Status Icon */}
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white/10 rounded-full text-white/80">
              {getStatusIcon(status)}
            </div>
          </div>

          {/* Status Message */}
          <h2 className="text-xl font-medium text-white mb-2">
            {getStatusMessage(status, progress)}
          </h2>

          {/* Progress Bar (only show during warming) */}
          {status === 'warming' && (
            <div className="mb-4">
              <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-orange-400 to-pink-400 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-white/60 text-sm">
                {Math.round(progress)}% complete
              </p>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && error && (
            <div className="mb-6">
              <p className="text-red-300 text-sm mb-4">
                {error}
              </p>
              <button
                onClick={onRetry}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg transition-colors duration-200 mx-auto"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            </div>
          )}

          {/* Info Text */}
          {status === 'warming' && (
            <p className="text-white/50 text-xs">
              Our server is starting up. This usually takes 60-70 seconds on the first visit.
            </p>
          )}

          {status === 'checking' && (
            <p className="text-white/50 text-xs">
              Establishing connection to our AI service...
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-white/40 text-xs flex items-center justify-center gap-1">
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
  );
};
