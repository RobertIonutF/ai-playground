import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { InterpreterInput, InterpreterResult } from '@/types/api';
import { createSafePayload, aiResponseCache, generatePayloadHash } from '@/lib/ai-utils';

export const maxDuration = 30; // Maximum duration for the request (30 seconds)

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// JSON Schema for structured output
const INTERPRETER_SCHEMA = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description: 'Concise summary of the API response (≤ 900 characters)',
      maxLength: 900,
    },
    keyFacts: {
      type: 'array',
      description: 'Important fields from the response (≤ 6 items)',
      maxItems: 6,
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          value: { type: 'string' },
        },
        required: ['label', 'value'],
        additionalProperties: false,
      },
    },
    errorInsight: {
      type: 'object',
      nullable: true,
      properties: {
        probableCause: { type: 'string' },
        suggestedFix: { type: 'string' },
      },
      required: ['probableCause', 'suggestedFix'],
      additionalProperties: false,
    },
    suggestions: {
      type: 'array',
      description: 'Suggested next API calls (≤ 4 items)',
      maxItems: 4,
      items: {
        type: 'object',
        properties: {
          method: { type: 'string' },
          path: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['method', 'path', 'description'],
        additionalProperties: false,
      },
    },
    confidence: {
      type: 'string',
      enum: ['low', 'medium', 'high'],
    },
  },
  required: ['summary', 'keyFacts', 'errorInsight', 'suggestions', 'confidence'],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are an API response interpreter for a developer tool. Analyze the request and response data and produce a concise, factual summary in English.

CRITICAL RULES:
- Never invent fields or values that aren't present in the response
- Always include key facts from the response
- Detect possible errors for 4xx and 5xx status codes
- Suggest next logical endpoints when appropriate
- Output JSON that matches the provided schema exactly
- Keep summary under 900 characters
- Limit key facts to 6 most important items
- Limit suggestions to 4 items
- Be factual and precise, not creative`;

/**
 * Generate fallback response when AI is unavailable
 */
function generateFallbackResponse(input: InterpreterInput): InterpreterResult {
  const { response } = input;
  const isError = response.status >= 400;

  return {
    summary: isError
      ? `Request failed with status ${response.status}. Check the response details for more information.`
      : `API request completed successfully with status ${response.status}. Response contains ${typeof response.body === 'object' ? Object.keys(response.body).length : 'data'} fields.`,
    keyFacts: [
      { label: 'Status', value: response.status.toString() },
      { label: 'Duration', value: `${response.durationMs}ms` },
      { label: 'Size', value: `${response.sizeBytes} bytes` },
    ],
    errorInsight: isError
      ? {
          probableCause: 'The server returned an error status code.',
          suggestedFix: 'Check the request parameters and authentication.',
        }
      : null,
    suggestions: [],
    confidence: 'low',
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
    const input: InterpreterInput = body;

    // Validate input
    if (!input.request || !input.response) {
      return NextResponse.json(
        { error: 'Invalid input: request and response are required' },
        { status: 400 }
      );
    }

    // Sanitize payload
    const safePayload = createSafePayload(input);

    // Check cache
    const cacheKey = await generatePayloadHash(safePayload);
    const cachedResult = aiResponseCache.get(cacheKey);
    if (cachedResult) {
      return NextResponse.json({
        ...cachedResult,
        _cached: true,
      });
    }

    // Construct user prompt
    const userPrompt = `Summarize and analyze this API interaction for a developer. Do not hallucinate or add fictional data.

Request:
Method: ${safePayload.request.method}
URL: ${safePayload.request.url}
Headers: ${JSON.stringify(safePayload.request.headers, null, 2)}
Body: ${JSON.stringify(safePayload.request.body, null, 2)}

Response:
Status: ${safePayload.response.status}
Duration: ${safePayload.response.durationMs}ms
Size: ${safePayload.response.sizeBytes} bytes
Headers: ${JSON.stringify(safePayload.response.headers, null, 2)}
Body: ${JSON.stringify(safePayload.response.body, null, 2)}`;

    // Call OpenAI with structured output
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using gpt-4o-mini as gpt-5 is not yet available
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'api_interpreter_response',
          strict: true,
          schema: INTERPRETER_SCHEMA,
        },
      },
      temperature: 0.3,
      max_tokens: 1500,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    // Parse and validate response
    let result: InterpreterResult;
    try {
      result = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      result = generateFallbackResponse(input);
    }

    // Cache the result
    aiResponseCache.set(cacheKey, result);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('AI explanation error:', error);

    // Return fallback response on error
    const fallbackResult = generateFallbackResponse(
      (await request.json()) as InterpreterInput
    );

    return NextResponse.json(
      {
        ...fallbackResult,
        _error: 'AI service temporarily unavailable',
      },
      { status: 200 } // Return 200 so UI can display fallback
    );
  }
}

