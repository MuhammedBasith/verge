import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export type ServerStatus = 'checking' | 'warming' | 'ready' | 'error';

interface ServerStatusState {
  status: ServerStatus;
  isReady: boolean;
  error: string | null;
  warmingProgress: number; // 0-100
}

export const useServerStatus = () => {
  const [state, setState] = useState<ServerStatusState>({
    status: 'checking',
    isReady: false,
    error: null,
    warmingProgress: 0,
  });

  const checkServerHealth = useCallback(async (): Promise<boolean> => {
    try {
      // Use the fastest health check endpoint
      const response = await axios.get(`${API_BASE_URL}/health/live`, {
        timeout: 5000, // 5 second timeout
      });
      return response.status === 200;
    } catch (error) {
      console.log('Health check failed:', error);
      return false;
    }
  }, []);

  const startServerCheck = useCallback(async () => {
    setState(prev => ({ ...prev, status: 'checking', warmingProgress: 0 }));

    // First quick check
    const isHealthy = await checkServerHealth();
    
    if (isHealthy) {
      setState({
        status: 'ready',
        isReady: true,
        error: null,
        warmingProgress: 100,
      });
      return;
    }

    // Server is cold, start warming process
    setState(prev => ({ ...prev, status: 'warming' }));

    let attempts = 0;
    const maxAttempts = 23; // Max 70 seconds (23 * 3s intervals + initial 1s)
    
    const pollServer = async () => {
      attempts++;
      // Progressive timing: slower progress initially, faster near the end
      let progress;
      if (attempts <= 5) {
        // First 15 seconds: 0-20%
        progress = (attempts / 5) * 20;
      } else if (attempts <= 15) {
        // Next 30 seconds: 20-70%
        progress = 20 + ((attempts - 5) / 10) * 50;
      } else {
        // Final 25 seconds: 70-95%
        progress = 70 + ((attempts - 15) / 8) * 25;
      }
      progress = Math.min(progress, 95); // Cap at 95% until success
      
      setState(prev => ({ 
        ...prev, 
        warmingProgress: progress 
      }));

      const isHealthy = await checkServerHealth();
      
      if (isHealthy) {
        setState({
          status: 'ready',
          isReady: true,
          error: null,
          warmingProgress: 100,
        });
        return;
      }

      if (attempts >= maxAttempts) {
        setState({
          status: 'error',
          isReady: false,
          error: 'Server startup is taking longer than expected. Please try refreshing the page or check back in a few minutes.',
          warmingProgress: 0,
        });
        return;
      }

      // Continue polling every 3 seconds
      setTimeout(pollServer, 3000);
    };

    // Start polling after initial failure
    setTimeout(pollServer, 2000);
  }, [checkServerHealth]);

  const retryConnection = useCallback(() => {
    setState({
      status: 'checking',
      isReady: false,
      error: null,
      warmingProgress: 0,
    });
    startServerCheck();
  }, [startServerCheck]);

  // Auto-start on mount
  useEffect(() => {
    startServerCheck();
  }, [startServerCheck]);

  return {
    ...state,
    retryConnection,
  };
};
