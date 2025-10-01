import { InterpreterInput } from '@/types/api';

// Maximum body size in bytes (64KB)
const MAX_BODY_SIZE = 64 * 1024;

// Sensitive header patterns to redact
const SENSITIVE_HEADER_PATTERNS = [
  /authorization/i,
  /api[-_]?key/i,
  /token/i,
  /cookie/i,
  /session/i,
  /secret/i,
  /password/i,
];

/**
 * Sanitize headers by removing sensitive values
 */
export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    const isSensitive = SENSITIVE_HEADER_PATTERNS.some(pattern => pattern.test(key));
    sanitized[key] = isSensitive ? '[REDACTED]' : value;
  }
  
  return sanitized;
}

/**
 * Truncate large bodies to prevent excessive token usage
 */
export function truncateBody(body: any): any {
  if (body === null || body === undefined) {
    return body;
  }

  // Handle binary data
  if (body instanceof ArrayBuffer || body instanceof Blob) {
    return {
      type: 'binary',
      size: body instanceof ArrayBuffer ? body.byteLength : body.size,
    };
  }

  const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
  const bodySizeBytes = new Blob([bodyString]).size;

  if (bodySizeBytes <= MAX_BODY_SIZE) {
    return body;
  }

  // Truncate and add notice
  const truncatedString = bodyString.substring(0, MAX_BODY_SIZE);
  try {
    // Try to parse back to object if it was JSON
    const parsed = JSON.parse(truncatedString);
    return {
      ...parsed,
      _truncated: true,
      _originalSize: bodySizeBytes,
    };
  } catch {
    // Return as truncated string
    return `${truncatedString}\n\n[TRUNCATED - Original size: ${bodySizeBytes} bytes]`;
  }
}

/**
 * Remove signed query parameters from URL
 */
export function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const paramsToRemove = ['signature', 'sig', 'token', 'key', 'apikey'];
    
    paramsToRemove.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * Create a sanitized payload safe for sending to OpenAI
 */
export function createSafePayload(input: InterpreterInput): InterpreterInput {
  return {
    request: {
      method: input.request.method,
      url: sanitizeUrl(input.request.url),
      headers: sanitizeHeaders(input.request.headers),
      body: truncateBody(input.request.body),
    },
    response: {
      status: input.response.status,
      durationMs: input.response.durationMs,
      headers: sanitizeHeaders(input.response.headers),
      body: truncateBody(input.response.body),
      sizeBytes: input.response.sizeBytes,
    },
    context: input.context,
  };
}

/**
 * Generate SHA-256 hash for caching
 */
export async function generatePayloadHash(payload: InterpreterInput): Promise<string> {
  const jsonString = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const data = encoder.encode(jsonString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Simple in-memory cache for AI responses
 * In production, consider using Redis or similar
 */
class ResponseCache {
  private cache: Map<string, { result: any; timestamp: number }>;
  private maxAge: number; // in milliseconds
  private maxSize: number;

  constructor(maxAge = 3600000, maxSize = 100) { // 1 hour default
    this.cache = new Map();
    this.maxAge = maxAge;
    this.maxSize = maxSize;
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  set(key: string, result: any): void {
    // Simple LRU: if cache is full, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const aiResponseCache = new ResponseCache();

/**
 * Estimate token count (rough approximation)
 * More accurate would use tiktoken library
 */
export function estimateTokenCount(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Create cache specifically for type generation
 * Uses different cache settings optimized for code generation
 */
export const typeGenerationCache = new ResponseCache(7200000, 50); // 2 hours, 50 items

/**
 * Sanitize response body specifically for type generation
 * Removes sensitive data while preserving structure for type inference
 */
export function sanitizeForTypeGeneration(body: any): any {
  if (body === null || body === undefined) {
    return body;
  }

  // Handle arrays
  if (Array.isArray(body)) {
    // For type generation, we only need the first few items to infer structure
    const sampleSize = Math.min(3, body.length);
    return body.slice(0, sampleSize).map(item => sanitizeForTypeGeneration(item));
  }

  // Handle objects
  if (typeof body === 'object' && body !== null) {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(body)) {
      // Skip keys that might contain sensitive information
      const isSensitive = SENSITIVE_HEADER_PATTERNS.some(pattern => pattern.test(key));
      
      if (isSensitive) {
        // Keep the key but replace value with a placeholder that preserves type
        if (typeof value === 'string') {
          sanitized[key] = '[REDACTED_STRING]';
        } else if (typeof value === 'number') {
          sanitized[key] = 0;
        } else if (typeof value === 'boolean') {
          sanitized[key] = false;
        } else {
          sanitized[key] = '[REDACTED]';
        }
      } else {
        sanitized[key] = sanitizeForTypeGeneration(value);
      }
    }
    
    return sanitized;
  }

  // For primitives, return as-is (they don't contain sensitive info)
  return body;
}

/**
 * Generate cache key for type generation requests
 */
export async function generateTypeGenerationHash(responseBody: any, language: string, style: string): Promise<string> {
  const sanitizedBody = sanitizeForTypeGeneration(responseBody);
  const payload = {
    responseBody: sanitizedBody,
    language,
    style,
    version: '1.0' // Include version for cache invalidation if needed
  };
  
  const jsonString = JSON.stringify(payload, Object.keys(payload).sort());
  const encoder = new TextEncoder();
  const data = encoder.encode(jsonString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Basic validation for generated TypeScript code
 */
export function validateTypeScriptSyntax(code: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Basic syntax checks
  if (!code.trim()) {
    errors.push('Generated code is empty');
    return { isValid: false, errors };
  }
  
  // Check for balanced braces
  const openBraces = (code.match(/\{/g) || []).length;
  const closeBraces = (code.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push('Mismatched braces in generated code');
  }
  
  // Check for balanced parentheses
  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push('Mismatched parentheses in generated code');
  }
  
  // Check for interface/type keywords
  if (!code.includes('interface') && !code.includes('type') && !code.includes('const') && !code.includes('class')) {
    errors.push('Generated code does not contain valid TypeScript type definitions');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Basic validation for generated Python code
 */
export function validatePythonSyntax(code: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Basic syntax checks
  if (!code.trim()) {
    errors.push('Generated code is empty');
    return { isValid: false, errors };
  }
  
  // Check for dataclass import and decorator
  if (code.includes('@dataclass') && !code.includes('from dataclasses import dataclass')) {
    errors.push('Missing dataclass import');
  }
  
  // Check for class definition
  if (!code.includes('class ')) {
    errors.push('Generated code does not contain a class definition');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

