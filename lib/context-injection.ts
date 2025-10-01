import { ApiContext, ApiEndpoint } from '@/types/api';

/**
 * Format API context for injection into GPT prompts
 * Keeps token usage low while providing useful endpoint information
 */

const MAX_ENDPOINTS_TO_INJECT = 50; // Limit to avoid token overflow

/**
 * Create a concise endpoint summary for AI context
 */
export function formatEndpointForAI(endpoint: ApiEndpoint): string {
  let summary = `${endpoint.method} ${endpoint.path}`;
  
  if (endpoint.summary) {
    summary += ` - ${endpoint.summary}`;
  }
  
  // Add required parameters info
  if (endpoint.parameters) {
    const required = endpoint.parameters.filter(p => p.required);
    if (required.length > 0) {
      const paramNames = required.map(p => p.name).join(', ');
      summary += ` (requires: ${paramNames})`;
    }
  }
  
  return summary;
}

/**
 * Format entire API context for injection into system prompts
 */
export function formatContextForAI(context: ApiContext): string {
  const endpoints = context.endpoints.slice(0, MAX_ENDPOINTS_TO_INJECT);
  
  let prompt = `\n\nAPI CONTEXT LOADED:\n`;
  prompt += `API Name: ${context.name}\n`;
  prompt += `Base URL: ${context.baseUrl}\n`;
  
  if (context.description) {
    prompt += `Description: ${context.description}\n`;
  }
  
  prompt += `\nAvailable Endpoints (${endpoints.length} of ${context.endpoints.length}):\n`;
  
  // Group by tags for better organization
  const grouped: Record<string, ApiEndpoint[]> = {};
  endpoints.forEach(endpoint => {
    const tag = endpoint.tags?.[0] || 'Other';
    if (!grouped[tag]) {
      grouped[tag] = [];
    }
    grouped[tag].push(endpoint);
  });
  
  Object.entries(grouped).forEach(([tag, tagEndpoints]) => {
    prompt += `\n[${tag}]\n`;
    tagEndpoints.forEach(endpoint => {
      prompt += `  • ${formatEndpointForAI(endpoint)}\n`;
    });
  });
  
  prompt += `\nIMPORTANT: When generating API requests, you MUST use only the endpoints listed above. `;
  prompt += `Always construct full URLs by combining the base URL with the endpoint path. `;
  prompt += `If a required parameter is mentioned, include it in the request.\n`;
  
  return prompt;
}

/**
 * Create a shorter version for conversation context (less verbose)
 */
export function formatContextSummaryForAI(context: ApiContext): string {
  const topEndpoints = context.endpoints.slice(0, 20);
  
  let summary = `\nAPI: ${context.name} (${context.baseUrl})\n`;
  summary += `Endpoints: ${topEndpoints.map(e => `${e.method} ${e.path}`).join(', ')}`;
  
  if (context.endpoints.length > 20) {
    summary += ` ... and ${context.endpoints.length - 20} more`;
  }
  
  return summary;
}

/**
 * Find the best matching endpoint for a user's natural language query
 */
export function findMatchingEndpoint(
  context: ApiContext,
  query: string
): ApiEndpoint | null {
  const lowerQuery = query.toLowerCase();
  
  // Scoring function
  const scoreEndpoint = (endpoint: ApiEndpoint): number => {
    let score = 0;
    
    // Check path match
    if (endpoint.path.toLowerCase().includes(lowerQuery)) {
      score += 10;
    }
    
    // Check method match
    if (lowerQuery.includes(endpoint.method.toLowerCase())) {
      score += 5;
    }
    
    // Check summary match
    if (endpoint.summary?.toLowerCase().includes(lowerQuery)) {
      score += 8;
    }
    
    // Check description match
    if (endpoint.description?.toLowerCase().includes(lowerQuery)) {
      score += 5;
    }
    
    // Check tags match
    if (endpoint.tags?.some(tag => lowerQuery.includes(tag.toLowerCase()))) {
      score += 3;
    }
    
    return score;
  };
  
  // Score all endpoints
  const scored = context.endpoints.map(endpoint => ({
    endpoint,
    score: scoreEndpoint(endpoint),
  }));
  
  // Sort by score
  scored.sort((a, b) => b.score - a.score);
  
  // Return best match if score is above threshold
  if (scored.length > 0 && scored[0].score > 0) {
    return scored[0].endpoint;
  }
  
  return null;
}

/**
 * Estimate token count for context injection
 * Rough approximation: 1 token ≈ 4 characters
 */
export function estimateContextTokens(context: ApiContext): number {
  const formatted = formatContextForAI(context);
  return Math.ceil(formatted.length / 4);
}

/**
 * Check if context is too large for injection
 */
export function isContextTooLarge(context: ApiContext, maxTokens: number = 2000): boolean {
  return estimateContextTokens(context) > maxTokens;
}

/**
 * Create a trimmed version of context if it's too large
 */
export function trimContextForInjection(
  context: ApiContext,
  maxEndpoints: number = 30
): ApiContext {
  return {
    ...context,
    endpoints: context.endpoints.slice(0, maxEndpoints),
  };
}

