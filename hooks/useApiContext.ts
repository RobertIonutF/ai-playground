import { useState, useEffect } from 'react';
import { ApiContext } from '@/types/api';
import { getActiveContext, saveContext, setActiveContext } from '@/lib/context-store';

export function useApiContext() {
  const [context, setContext] = useState<ApiContext | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadContext = () => {
      const active = getActiveContext();
      setContext(active);
      setIsLoaded(true);
    };

    loadContext();

    // Listen for storage changes from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'api-playground-contexts') {
        loadContext();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updateContext = (newContext: ApiContext) => {
    saveContext(newContext);
    setActiveContext(newContext.id);
    setContext(newContext);
  };

  const clearContext = () => {
    setActiveContext(null);
    setContext(null);
  };

  return {
    context,
    isLoaded,
    updateContext,
    clearContext,
    hasContext: !!context,
  };
}

