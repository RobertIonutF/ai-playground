import { ApiContext, ApiContextStore } from '@/types/api';

const STORAGE_KEY = 'api-playground-contexts';
const MAX_CONTEXTS = 20; // Maximum number of contexts to store

/**
 * API Context Store
 * Manages persistence and CRUD operations for API contexts
 */

/**
 * Load all contexts from localStorage
 */
export function loadContextStore(): ApiContextStore {
  if (typeof window === 'undefined') {
    return { contexts: [], activeContextId: null, lastUpdated: Date.now() };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { contexts: [], activeContextId: null, lastUpdated: Date.now() };
    }

    const store: ApiContextStore = JSON.parse(stored);
    return store;
  } catch (error) {
    console.error('Failed to load context store:', error);
    return { contexts: [], activeContextId: null, lastUpdated: Date.now() };
  }
}

/**
 * Save context store to localStorage
 */
export function saveContextStore(store: ApiContextStore): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error('Failed to save context store:', error);
  }
}

/**
 * Add or update a context
 */
export function saveContext(context: ApiContext): ApiContextStore {
  const store = loadContextStore();

  const existingIndex = store.contexts.findIndex(c => c.id === context.id);

  if (existingIndex >= 0) {
    // Update existing context
    store.contexts[existingIndex] = {
      ...context,
      lastUpdated: Date.now(),
    };
  } else {
    // Add new context
    store.contexts.unshift(context);

    // Limit number of contexts
    if (store.contexts.length > MAX_CONTEXTS) {
      store.contexts = store.contexts.slice(0, MAX_CONTEXTS);
    }
  }

  store.lastUpdated = Date.now();
  saveContextStore(store);
  return store;
}

/**
 * Get a context by ID
 */
export function getContext(contextId: string): ApiContext | null {
  const store = loadContextStore();
  return store.contexts.find(c => c.id === contextId) || null;
}

/**
 * Get all contexts
 */
export function getAllContexts(): ApiContext[] {
  const store = loadContextStore();
  return store.contexts.sort((a, b) => b.lastUpdated - a.lastUpdated);
}

/**
 * Delete a context
 */
export function deleteContext(contextId: string): ApiContextStore {
  const store = loadContextStore();

  store.contexts = store.contexts.filter(c => c.id !== contextId);

  // Clear active context if it's the one being deleted
  if (store.activeContextId === contextId) {
    store.activeContextId = null;
  }

  store.lastUpdated = Date.now();
  saveContextStore(store);
  return store;
}

/**
 * Set active context
 */
export function setActiveContext(contextId: string | null): ApiContextStore {
  const store = loadContextStore();

  if (contextId !== null) {
    // Verify context exists
    const context = store.contexts.find(c => c.id === contextId);
    if (context) {
      store.activeContextId = contextId;
    } else {
      console.warn(`Attempted to set active context to non-existent ID: ${contextId}. Setting active context to null.`);
      store.activeContextId = null; // Set to null if the context doesn't exist
    }
  } else {
    // If contextId is null, it means we are clearing the active context
    store.activeContextId = null;
  }
  store.lastUpdated = Date.now();
  saveContextStore(store);
  return store;
}

/**
 * Get active context
 */
export function getActiveContext(): ApiContext | null {
  const store = loadContextStore();

  if (!store.activeContextId) {
    return null;
  }

  return store.contexts.find(c => c.id === store.activeContextId) || null;
}

/**
 * Clear all contexts
 */
export function clearAllContexts(): ApiContextStore {
  const emptyStore: ApiContextStore = {
    contexts: [],
    activeContextId: null,
    lastUpdated: Date.now(),
  };

  saveContextStore(emptyStore);
  return emptyStore;
}

/**
 * Search contexts by name or base URL
 */
export function searchContexts(query: string): ApiContext[] {
  const store = loadContextStore();
  const lowerQuery = query.toLowerCase();

  return store.contexts.filter(context =>
    context.name.toLowerCase().includes(lowerQuery) ||
    context.baseUrl.toLowerCase().includes(lowerQuery) ||
    context.description?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Generate unique context ID
 */
export function generateContextId(): string {
  return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Export context as JSON
 */
export function exportContext(contextId: string): string {
  const context = getContext(contextId);
  if (!context) {
    throw new Error('Context not found');
  }

  return JSON.stringify(context, null, 2);
}

/**
 * Import context from JSON
 */
export function importContext(jsonString: string): ApiContext {
  try {
    const context: ApiContext = JSON.parse(jsonString);

    // Validate required fields
    if (!context.name || !context.baseUrl || !Array.isArray(context.endpoints)) {
      throw new Error('Invalid context format');
    }

    // Generate new ID to avoid conflicts
    context.id = generateContextId();
    context.createdAt = Date.now();
    context.lastUpdated = Date.now();

    // Save the imported context
    saveContext(context);

    return context;
  } catch (error) {
    throw new Error(`Failed to import context: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get context statistics
 */
export function getContextStats(contextId: string) {
  const context = getContext(contextId);
  if (!context) {
    return null;
  }

  const methodCounts: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};
  let totalEndpoints = context.endpoints.length;
  let endpointsWithAuth = 0;

  context.endpoints.forEach(endpoint => {
    // Count methods
    methodCounts[endpoint.method] = (methodCounts[endpoint.method] || 0) + 1;

    // Count tags
    if (endpoint.tags) {
      endpoint.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }

    // Count auth requirements
    if (endpoint.requiresAuth) {
      endpointsWithAuth++;
    }
  });

  return {
    totalEndpoints,
    methodCounts,
    tagCounts,
    endpointsWithAuth,
    authPercentage: totalEndpoints > 0 ? (endpointsWithAuth / totalEndpoints) * 100 : 0,
    lastUpdated: context.lastUpdated,
    createdAt: context.createdAt,
  };
}

