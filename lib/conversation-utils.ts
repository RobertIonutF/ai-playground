import { ConversationMessage, ConversationSession, SessionContext, ConversationRequest, ApiRequest, Header } from '@/types/api';

/**
 * Generate unique ID for conversation entities
 */
export function generateConversationId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Simple in-memory cache for conversation sessions
 * In production, consider using IndexedDB or similar
 */
class ConversationCache {
  private cache: Map<string, ConversationSession>;
  private maxSessions: number;

  constructor(maxSessions = 10) {
    this.cache = new Map();
    this.maxSessions = maxSessions;
  }

  get(sessionId: string): ConversationSession | null {
    return this.cache.get(sessionId) || null;
  }

  set(session: ConversationSession): void {
    // Simple LRU: if cache is full, remove oldest session
    if (this.cache.size >= this.maxSessions) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(session.id, session);
  }

  delete(sessionId: string): void {
    this.cache.delete(sessionId);
  }

  clear(): void {
    this.cache.clear();
  }

  getAllSessions(): ConversationSession[] {
    return Array.from(this.cache.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }
}

export const conversationCache = new ConversationCache();

/**
 * Create a new conversation session
 */
export function createConversationSession(baseUrl?: string): ConversationSession {
  return {
    id: generateConversationId(),
    messages: [],
    context: {
      previousRequests: [],
      variables: {},
      baseUrl,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Add a message to a conversation session
 */
export function addMessageToSession(
  session: ConversationSession, 
  message: ConversationMessage
): ConversationSession {
  const updatedSession = {
    ...session,
    messages: [...session.messages, message],
    updatedAt: Date.now(),
  };

  conversationCache.set(updatedSession);
  return updatedSession;
}

/**
 * Update session context with new request
 */
export function updateSessionContext(
  session: ConversationSession,
  request: ConversationRequest
): ConversationSession {
  const maxPreviousRequests = 5; // Keep last 5 requests for context
  
  const updatedSession = {
    ...session,
    context: {
      ...session.context,
      previousRequests: [
        request,
        ...session.context.previousRequests
      ].slice(0, maxPreviousRequests),
    },
    updatedAt: Date.now(),
  };

  conversationCache.set(updatedSession);
  return updatedSession;
}

/**
 * Update session variables
 */
export function updateSessionVariables(
  session: ConversationSession,
  variables: Record<string, string>
): ConversationSession {
  const updatedSession = {
    ...session,
    context: {
      ...session.context,
      variables: { ...session.context.variables, ...variables },
    },
    updatedAt: Date.now(),
  };

  conversationCache.set(updatedSession);
  return updatedSession;
}

/**
 * Convert ConversationRequest to ApiRequest format
 */
export function conversationRequestToApiRequest(
  conversationRequest: ConversationRequest,
  name?: string
): ApiRequest {
  // Convert headers object to Header array
  const headers: Header[] = Object.entries(conversationRequest.headers || {}).map(([key, value]) => ({
    id: generateConversationId(),
    key,
    value,
    enabled: true,
  }));

  return {
    id: generateConversationId(),
    name: name || `AI Generated ${conversationRequest.method}`,
    method: conversationRequest.method,
    url: conversationRequest.url,
    headers,
    body: conversationRequest.body ? 
      (typeof conversationRequest.body === 'string' ? 
        conversationRequest.body : 
        JSON.stringify(conversationRequest.body, null, 2)
      ) : '',
    bodyType: conversationRequest.body ? 'json' : 'none',
    timestamp: Date.now(),
  };
}

/**
 * Convert ApiRequest to ConversationRequest format
 */
export function apiRequestToConversationRequest(apiRequest: ApiRequest): ConversationRequest {
  // Convert Header array to headers object
  const headers: Record<string, string> = {};
  apiRequest.headers.forEach(header => {
    if (header.enabled && header.key && header.value) {
      headers[header.key] = header.value;
    }
  });

  let body: any = undefined;
  if (apiRequest.bodyType !== 'none' && apiRequest.body) {
    try {
      body = JSON.parse(apiRequest.body);
    } catch {
      body = apiRequest.body; // Keep as string if not valid JSON
    }
  }

  return {
    method: apiRequest.method,
    url: apiRequest.url,
    headers,
    body,
  };
}

/**
 * Extract variables from session that might be useful for context
 */
export function extractVariablesFromSession(session: ConversationSession): Record<string, string> {
  const variables: Record<string, string> = { ...session.context.variables };

  // Extract common variables from previous requests
  session.context.previousRequests.forEach(request => {
    // Look for authorization headers
    Object.entries(request.headers).forEach(([key, value]) => {
      if (key.toLowerCase().includes('authorization') && value.includes('Bearer ')) {
        variables['token'] = value.replace('Bearer ', '');
      }
      if (key.toLowerCase().includes('api-key') || key.toLowerCase().includes('apikey')) {
        variables['apiKey'] = value;
      }
    });
  });

  return variables;
}

/**
 * Sanitize message content for display
 */
export function sanitizeMessage(content: string): string {
  return content
    .replace(/\b\w*password\w*\b/gi, '[PASSWORD]')
    .replace(/\b\w*token\w*\b/gi, '[TOKEN]')
    .replace(/\b\w*secret\w*\b/gi, '[SECRET]')
    .replace(/\b\w*key\w*\b/gi, '[KEY]');
}

/**
 * Format conversation message for export
 */
export function formatMessageForExport(message: ConversationMessage, includeTimestamp = true): string {
  const timestamp = includeTimestamp ? `[${new Date(message.timestamp).toISOString()}] ` : '';
  const role = message.role === 'user' ? '👤 User' : '🤖 Assistant';
  
  let content = `${timestamp}${role}: ${message.content}`;
  
  if (message.requestPreview) {
    content += `\n\n📋 Generated Request:\n${message.requestPreview.method} ${message.requestPreview.url}`;
    
    if (Object.keys(message.requestPreview.headers).length > 0) {
      content += `\nHeaders: ${JSON.stringify(message.requestPreview.headers, null, 2)}`;
    }
    
    if (message.requestPreview.body) {
      content += `\nBody: ${JSON.stringify(message.requestPreview.body, null, 2)}`;
    }
  }
  
  return content;
}

/**
 * Export conversation session as markdown
 */
export function exportConversationAsMarkdown(session: ConversationSession): string {
  const title = `# API Conversation Session\n\n`;
  const info = `**Session ID:** ${session.id}\n**Created:** ${new Date(session.createdAt).toLocaleString()}\n**Updated:** ${new Date(session.updatedAt).toLocaleString()}\n\n`;
  
  const context = session.context.baseUrl ? `**Base URL:** ${session.context.baseUrl}\n\n` : '';
  
  const messages = session.messages.map((message, index) => {
    const messageContent = formatMessageForExport(message, false);
    return `## Message ${index + 1}\n\n${messageContent}\n\n---\n\n`;
  }).join('');
  
  return title + info + context + messages;
}

/**
 * Get conversation statistics
 */
export function getConversationStats(session: ConversationSession) {
  const userMessages = session.messages.filter(m => m.role === 'user').length;
  const assistantMessages = session.messages.filter(m => m.role === 'assistant').length;
  const requestsGenerated = session.messages.filter(m => m.requestPreview).length;
  
  return {
    totalMessages: session.messages.length,
    userMessages,
    assistantMessages,
    requestsGenerated,
    sessionDuration: session.updatedAt - session.createdAt,
    lastActivity: session.updatedAt,
  };
}

/**
 * Clean up old conversation sessions
 */
export function cleanupOldSessions(maxAge = 7 * 24 * 60 * 60 * 1000): void { // 7 days default
  const cutoff = Date.now() - maxAge;
  const sessions = conversationCache.getAllSessions();
  
  sessions.forEach(session => {
    if (session.updatedAt < cutoff) {
      conversationCache.delete(session.id);
    }
  });
}
