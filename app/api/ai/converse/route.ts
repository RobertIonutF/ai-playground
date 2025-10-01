import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ConversationInput, ConversationResult } from '@/types/api';
import { sanitizeHeaders, sanitizeUrl } from '@/lib/ai-utils';
import { getActiveContext } from '@/lib/context-store';
import { formatContextForAI, trimContextForInjection, isContextTooLarge } from '@/lib/context-injection';

export const maxDuration = 30; // Maximum duration for the request (30 seconds)

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// JSON Schema for structured output according to PRD
const CONVERSATION_SCHEMA = {
  type: 'object',
  properties: {
    intent: {
      type: 'string',
      description: 'Brief description of what the user wants to do'
    },
    request: {
      type: 'object',
      required: ['method', 'url'],
      properties: {
        method: { 
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
        },
        url: { 
          type: 'string',
          description: 'Full URL for the API request'
        },
        headers: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'HTTP headers as key-value pairs'
        },
        body: {
          description: 'Request body (can be object, string, or null)'
        }
      },
      additionalProperties: false
    },
    explanation: {
      type: 'string',
      description: 'Human-readable explanation of what the API call will do'
    },
    confidence: {
      type: 'string',
      enum: ['low', 'medium', 'high']
    },
    clarificationNeeded: {
      type: 'boolean',
      description: 'Whether the request needs clarification from the user'
    },
    clarificationQuestion: {
      type: 'string',
      description: 'Question to ask if clarification is needed'
    }
  },
  required: ['intent', 'request', 'explanation', 'confidence'],
  additionalProperties: false
};

// System prompt based on PRD specifications
function createSystemPrompt(hasApiContext: boolean): string {
  let prompt = `You are an API command interpreter for a developer playground.
Your goal is to translate natural language into executable API requests.
Always respond with structured JSON containing the intent, request, and a short explanation.

RULES:
- Use only endpoints and fields that exist in the provided schema if available
- Never fabricate endpoints or guess data values without basis
- If the user's request is ambiguous, set clarificationNeeded to true and ask a clarifying question
- Always build complete, valid URLs (including protocol if baseUrl is not provided)
- Use appropriate HTTP methods based on the action (GET for retrieval, POST for creation, etc.)
- Include sensible default headers like Content-Type when needed
- Preserve context from previous requests in the conversation
- Reference variables from session context when mentioned by user

CONTEXT USAGE:
- Use baseUrl from context if provided for relative paths
- Reference previousRequests when user says "like the last one" or similar
- Use variables from context when user mentions tokens, keys, or other stored values
- If user references data from previous responses, acknowledge but don't assume specific values

ERROR HANDLING:
- If the request is unclear, set clarificationNeeded=true with a specific question
- If no schema is provided and endpoint seems non-standard, use lower confidence
- Always provide a confidence level based on how certain you are about the request`;

  if (hasApiContext) {
    prompt += `\n\n⚠️ CRITICAL: An API context has been loaded with specific endpoints. You MUST use only these endpoints. Do not invent or guess endpoints not in the list.`;
  }

  return prompt;
}

/**
 * Create sanitized context safe for sending to OpenAI
 */
function createSafeContext(sessionContext: any) {
  return {
    previousRequests: sessionContext.previousRequests?.map((req: any) => ({
      method: req.method,
      url: sanitizeUrl(req.url),
      headers: sanitizeHeaders(req.headers || {}),
      body: req.body ? '[BODY_PRESENT]' : null
    })).slice(-3) || [], // Only keep last 3 requests
    variables: Object.keys(sessionContext.variables || {}).reduce((acc: any, key) => {
      acc[key] = '[REDACTED]'; // Don't send actual values
      return acc;
    }, {}),
    baseUrl: sessionContext.baseUrl || null
  };
}

/**
 * Generate fallback response when AI is unavailable
 */
function generateFallbackResponse(message: string): ConversationResult {
  // Simple keyword-based fallback
  const method = message.toLowerCase().includes('post') || message.toLowerCase().includes('create') || message.toLowerCase().includes('add') 
    ? 'POST' 
    : message.toLowerCase().includes('put') || message.toLowerCase().includes('update') || message.toLowerCase().includes('edit')
    ? 'PUT'
    : message.toLowerCase().includes('delete') || message.toLowerCase().includes('remove')
    ? 'DELETE'
    : 'GET';

  return {
    intent: 'API request interpretation failed',
    request: {
      method: method as any,
      url: 'https://api.example.com/endpoint',
      headers: { 'Content-Type': 'application/json' },
      body: method !== 'GET' ? {} : undefined
    },
    explanation: `AI interpretation failed. This is a basic ${method} request template. Please edit the URL and other details manually.`,
    confidence: 'low',
    clarificationNeeded: true,
    clarificationQuestion: 'Could you please provide the specific API endpoint URL and any required parameters?'
  };
}

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in .env.local' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const conversationInput: ConversationInput = body;

    // Validate input
    if (!conversationInput.message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (conversationInput.message.length > 1000) {
      return NextResponse.json(
        { error: 'Message too long (max 1000 characters)' },
        { status: 400 }
      );
    }

    // Load active API context if available
    const apiContext = getActiveContext();
    let contextForAI = apiContext;

    // Trim context if too large
    if (apiContext && isContextTooLarge(apiContext)) {
      contextForAI = trimContextForInjection(apiContext, 30);
    }

    // Create safe context for OpenAI
    const safeContext = createSafeContext(conversationInput.sessionContext || {});

    // Construct user prompt
    let userPrompt = `Message: "${conversationInput.message}"\n\n`;
    
    if (safeContext.baseUrl) {
      userPrompt += `Base URL: ${safeContext.baseUrl}\n`;
    }
    
    if (safeContext.previousRequests.length > 0) {
      userPrompt += `Recent requests:\n${safeContext.previousRequests.map(req => `${req.method} ${req.url}`).join('\n')}\n`;
    }
    
    if (Object.keys(safeContext.variables).length > 0) {
      userPrompt += `Available variables: ${Object.keys(safeContext.variables).join(', ')}\n`;
    }

    if (conversationInput.apiSchema) {
      userPrompt += `\nAPI Schema:\n${conversationInput.apiSchema.substring(0, 2000)}${conversationInput.apiSchema.length > 2000 ? '...[truncated]' : ''}\n`;
    }

    // Inject API context if available
    if (contextForAI) {
      const contextPrompt = formatContextForAI(contextForAI);
      userPrompt += contextPrompt;
    }

    userPrompt += '\nGenerate an appropriate HTTP request for this message.';

    // Call OpenAI with structured output
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using same model as other endpoints for consistency
      messages: [
        { role: 'system', content: createSystemPrompt(!!contextForAI) },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'api_conversation_result',
          strict: false,
          schema: CONVERSATION_SCHEMA,
        },
      },
      temperature: 0.1, // Low temperature for consistent interpretation
      max_tokens: 1500,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    // Parse and validate response
    let result: ConversationResult;
    try {
      result = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      result = generateFallbackResponse(conversationInput.message);
    }

    // Basic validation of the generated request
    if (!result.request.url || !result.request.url.startsWith('http')) {
      // If URL is not complete, try to construct it with base URL
      if (safeContext.baseUrl && result.request.url) {
        result.request.url = new URL(result.request.url, safeContext.baseUrl).toString();
      } else {
        result.confidence = 'low';
        result.clarificationNeeded = true;
        result.clarificationQuestion = result.clarificationQuestion || 'Could you provide the complete API endpoint URL?';
      }
    }

    // Ensure headers object exists
    if (!result.request.headers) {
      result.request.headers = {};
    }

    // Add default Content-Type for requests with body
    if (result.request.body && !result.request.headers['Content-Type']) {
      result.request.headers['Content-Type'] = 'application/json';
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('AI conversation error:', error);

    // Return fallback response on error
    let fallbackResult;
    try {
      const requestBody = await request.json();
      fallbackResult = generateFallbackResponse(requestBody.message || 'API request');
    } catch {
      fallbackResult = generateFallbackResponse('API request');
    }

    return NextResponse.json(
      {
        ...fallbackResult,
        _error: 'AI service temporarily unavailable',
      },
      { status: 200 } // Return 200 so UI can display fallback
    );
  }
}
