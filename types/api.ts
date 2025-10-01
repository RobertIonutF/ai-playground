export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface Header {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface ApiRequest {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: Header[];
  body: string;
  bodyType: 'json' | 'raw' | 'none';
  timestamp: number;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  responseTime: number;
  size: number;
}

export interface RequestHistory {
  requests: ApiRequest[];
  maxSize: number;
}

// AI Interpreter Types
export interface InterpreterInput {
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: any;
  };
  response: {
    status: number;
    durationMs: number;
    headers: Record<string, string>;
    body: any;
    sizeBytes: number;
  };
  context?: {
    apiLabel?: string;
    userLocale?: string;
  };
}

export interface KeyFact {
  label: string;
  value: string;
}

export interface ErrorInsight {
  probableCause: string;
  suggestedFix: string;
}

export interface SuggestedCall {
  method: string;
  path: string;
  description: string;
}

export interface InterpreterResult {
  summary: string;
  keyFacts: KeyFact[];
  errorInsight?: ErrorInsight | null;
  suggestions: SuggestedCall[];
  confidence: 'low' | 'medium' | 'high';
}

// AI Auto Type Generator Types
export type TypeLanguage = 'typescript' | 'python';
export type TypeStyle = 'interface' | 'zod' | 'dataclass';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface AutoTypeRequest {
  responseBody: any;
  language: TypeLanguage;
  style: TypeStyle;
}

export interface AutoTypeResult {
  language: TypeLanguage;
  style: TypeStyle;
  code: string;
  notes?: string[];
  confidence: ConfidenceLevel;
}

// AI Conversation Mode Types
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  requestPreview?: ConversationRequest;
}

export interface ConversationRequest {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: any;
}

export interface SessionContext {
  previousRequests: ConversationRequest[];
  variables: Record<string, string>;
  baseUrl?: string;
  apiSchema?: string; // OpenAPI spec JSON
}

export interface ConversationInput {
  message: string;
  apiSchema?: string;
  sessionContext: SessionContext;
}

export interface ConversationResult {
  intent: string;
  request: ConversationRequest;
  explanation: string;
  confidence: ConfidenceLevel;
  clarificationNeeded?: boolean;
  clarificationQuestion?: string;
}

export interface ConversationSession {
  id: string;
  messages: ConversationMessage[];
  context: SessionContext;
  createdAt: number;
  updatedAt: number;
}

// API Context Loader Types (Smart API Context Loader Feature)
export type ParameterLocation = 'query' | 'path' | 'body' | 'header';

export interface Parameter {
  name: string;
  in: ParameterLocation;
  required: boolean;
  type?: string;
  description?: string;
  schema?: any;
}

export interface ApiEndpoint {
  method: HttpMethod;
  path: string;
  summary?: string;
  description?: string;
  parameters?: Parameter[];
  requestBody?: {
    description?: string;
    required?: boolean;
    content?: any;
  };
  responses?: Record<string, any>;
  operationId?: string;
  tags?: string[];
  requiresAuth?: boolean;
}

export interface ApiContext {
  id: string;
  name: string;
  baseUrl: string;
  sourceUrl?: string;
  sourceType?: 'openapi' | 'swagger' | 'postman' | 'html' | 'manual';
  version?: string;
  description?: string;
  endpoints: ApiEndpoint[];
  securitySchemes?: Record<string, any>;
  servers?: Array<{ url: string; description?: string }>;
  lastUpdated: number;
  createdAt: number;
}

export interface ApiContextStore {
  contexts: ApiContext[];
  activeContextId: string | null;
  lastUpdated: number;
}

// API Context Parsing Types
export interface ParsedDocumentation {
  baseUrl: string;
  endpoints: ApiEndpoint[];
  metadata: {
    title?: string;
    version?: string;
    description?: string;
    sourceType: 'openapi' | 'swagger' | 'postman' | 'html';
  };
}

export interface ParserOptions {
  maxEndpoints?: number;
  includeDeprecated?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
}

export type DocType = 'openapi' | 'swagger' | 'postman' | 'html' | 'unknown';

