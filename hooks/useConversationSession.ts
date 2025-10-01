import { useState, useEffect } from 'react';
import { ConversationSession } from '@/types/api';
import { createConversationSession, cleanupOldSessions } from '@/lib/conversation-utils';

interface UseConversationSessionReturn {
  session: ConversationSession;
  updateSession: (session: ConversationSession) => void;
  clearSession: () => void;
  createNewSession: (baseUrl?: string) => void;
  isLoaded: boolean;
}

/**
 * Custom hook for managing conversation sessions
 * Provides session persistence and cleanup functionality
 */
export function useConversationSession(baseUrl?: string): UseConversationSessionReturn {
  const [session, setSession] = useState<ConversationSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize session on mount
  useEffect(() => {
    const initializeSession = () => {
      try {
        // Try to load session from localStorage
        const storedSessionId = localStorage.getItem('api-playground-current-conversation');
        
        if (storedSessionId) {
          const storedSession = localStorage.getItem(`conversation-session-${storedSessionId}`);
          if (storedSession) {
            const parsedSession: ConversationSession = JSON.parse(storedSession);
            // Update base URL if provided and different
            if (baseUrl && parsedSession.context.baseUrl !== baseUrl) {
              parsedSession.context.baseUrl = baseUrl;
              parsedSession.updatedAt = Date.now();
            }
            setSession(parsedSession);
            setIsLoaded(true);
            return;
          }
        }

        // Create new session if no valid stored session found
        const newSession = createConversationSession(baseUrl);
        setSession(newSession);
        persistSession(newSession);
        setIsLoaded(true);

      } catch (error) {
        console.error('Failed to initialize conversation session:', error);
        // Fallback to new session
        const newSession = createConversationSession(baseUrl);
        setSession(newSession);
        setIsLoaded(true);
      }
    };

    initializeSession();

    // Cleanup old sessions on initialization
    cleanupOldSessions();

    // Cleanup interval (runs every hour)
    const cleanupInterval = setInterval(() => {
      cleanupOldSessions();
    }, 60 * 60 * 1000);

    return () => clearInterval(cleanupInterval);
  }, [baseUrl]);

  // Persist session to localStorage
  const persistSession = (sessionToSave: ConversationSession) => {
    try {
      localStorage.setItem(`conversation-session-${sessionToSave.id}`, JSON.stringify(sessionToSave));
      localStorage.setItem('api-playground-current-conversation', sessionToSave.id);
    } catch (error) {
      console.error('Failed to persist conversation session:', error);
    }
  };

  const updateSession = (updatedSession: ConversationSession) => {
    setSession(updatedSession);
    persistSession(updatedSession);
  };

  const clearSession = () => {
    if (session) {
      try {
        localStorage.removeItem(`conversation-session-${session.id}`);
        localStorage.removeItem('api-playground-current-conversation');
      } catch (error) {
        console.error('Failed to clear session from storage:', error);
      }
    }

    const newSession = createConversationSession(baseUrl);
    setSession(newSession);
    persistSession(newSession);
  };

  const createNewSession = (newBaseUrl?: string) => {
    const effectiveBaseUrl = newBaseUrl || baseUrl;
    const newSession = createConversationSession(effectiveBaseUrl);
    setSession(newSession);
    persistSession(newSession);
  };

  // Return default session while loading to prevent null issues
  const defaultSession = session || createConversationSession(baseUrl);

  return {
    session: defaultSession,
    updateSession,
    clearSession,
    createNewSession,
    isLoaded,
  };
}

/**
 * Hook for managing conversation session list
 * Useful for history/session management features
 */
export function useConversationSessionList() {
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadSessions = () => {
      try {
        const sessionIds: string[] = [];
        const loadedSessions: ConversationSession[] = [];

        // Get all conversation session keys from localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('conversation-session-')) {
            const sessionId = key.replace('conversation-session-', '');
            sessionIds.push(sessionId);
          }
        }

        // Load each session
        sessionIds.forEach(sessionId => {
          try {
            const sessionData = localStorage.getItem(`conversation-session-${sessionId}`);
            if (sessionData) {
              const session: ConversationSession = JSON.parse(sessionData);
              loadedSessions.push(session);
            }
          } catch (error) {
            console.error(`Failed to parse session ${sessionId}:`, error);
          }
        });

        // Sort by last updated
        loadedSessions.sort((a, b) => b.updatedAt - a.updatedAt);
        
        setSessions(loadedSessions);
        setIsLoaded(true);

      } catch (error) {
        console.error('Failed to load conversation sessions:', error);
        setIsLoaded(true);
      }
    };

    loadSessions();
  }, []);

  const deleteSession = (sessionId: string) => {
    try {
      localStorage.removeItem(`conversation-session-${sessionId}`);
      
      // If this was the current session, clear that reference too
      const currentSessionId = localStorage.getItem('api-playground-current-conversation');
      if (currentSessionId === sessionId) {
        localStorage.removeItem('api-playground-current-conversation');
      }

      setSessions(prev => prev.filter(session => session.id !== sessionId));
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const clearAllSessions = () => {
    try {
      sessions.forEach(session => {
        localStorage.removeItem(`conversation-session-${session.id}`);
      });
      localStorage.removeItem('api-playground-current-conversation');
      setSessions([]);
    } catch (error) {
      console.error('Failed to clear all sessions:', error);
    }
  };

  return {
    sessions,
    deleteSession,
    clearAllSessions,
    isLoaded,
  };
}
