import { ApiRequest, Header } from '@/types/api';

// Counter to ensure uniqueness even within the same millisecond
let idCounter = 0;

export function generateId(): string {
  // Increment counter and reset if it gets too large
  idCounter = (idCounter + 1) % 10000;
  
  // Combine timestamp, counter, and random string for guaranteed uniqueness
  return `${Date.now()}-${idCounter}-${Math.random().toString(36).substring(2, 11)}`;
}

export function parseHeaders(headers: Header[]): Record<string, string> {
  return headers
    .filter(h => h.enabled && h.key.trim())
    .reduce((acc, h) => {
      acc[h.key.trim()] = h.value;
      return acc;
    }, {} as Record<string, string>);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function formatResponseTime(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function toCurl(request: ApiRequest): string {
  const headers = parseHeaders(request.headers);
  let curl = `curl -X ${request.method} '${request.url}'`;
  
  Object.entries(headers).forEach(([key, value]) => {
    curl += ` \\\n  -H '${key}: ${value}'`;
  });

  if (request.body && request.method !== 'GET' && request.method !== 'HEAD') {
    curl += ` \\\n  -d '${request.body.replace(/'/g, "\\'")}'`;
  }

  return curl;
}

export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

export function prettyJson(obj: any): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

