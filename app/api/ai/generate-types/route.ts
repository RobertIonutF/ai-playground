import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { AutoTypeRequest, AutoTypeResult } from '@/types/api';
import { 
  sanitizeForTypeGeneration, 
  typeGenerationCache, 
  generateTypeGenerationHash,
  validateTypeScriptSyntax,
  validatePythonSyntax,
  estimateTokenCount
} from '@/lib/ai-utils';

export const maxDuration = 30; // Maximum duration for the request (30 seconds)

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// JSON Schema for structured output according to PRD
const AUTO_TYPE_SCHEMA = {
  type: 'object',
  properties: {
    language: {
      type: 'string',
      enum: ['typescript', 'python']
    },
    style: {
      type: 'string',
      enum: ['interface', 'zod', 'dataclass']
    },
    code: {
      type: 'string',
      description: 'Valid, compilable code matching the requested language and style'
    },
    notes: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 5,
      description: 'Optional notes about the type generation process'
    },
    confidence: {
      type: 'string',
      enum: ['low', 'medium', 'high']
    }
  },
  required: ['language', 'style', 'code', 'notes', 'confidence'],
  additionalProperties: false
};

// System prompt based on PRD specifications
const SYSTEM_PROMPT = `You are an expert API type inference assistant. 
Given a JSON response body, generate concise, idiomatic type definitions in the requested language and style. 
Infer types strictly from structure and value samples. 
Detect optional fields, arrays, nested objects, and nullable values. 
Never hallucinate properties that do not exist. 
Always output valid compilable code matching the provided schema.

RULES:
- Analyze structure and infer types from actual data
- Detect arrays and infer homogeneous vs heterogeneous types
- Mark fields as optional (?) if they might not always be present
- Use appropriate naming conventions for each language
- Generate clean, readable, production-ready code
- Add type annotations and imports as needed
- Ensure code compiles without errors`;

/**
 * Get language-specific prompt additions
 */
function getLanguagePrompt(language: string, style: string): string {
  if (language === 'typescript') {
    if (style === 'interface') {
      return `Generate TypeScript interface definitions. Use interface syntax, proper naming conventions (PascalCase), and mark optional fields with ?.
Example:
interface User {
  id: number;
  name: string;
  email?: string;
  posts: Post[];
}`;
    } else if (style === 'zod') {
      return `Generate Zod schema definitions. Include the necessary Zod import and use proper Zod syntax.
Example:
import { z } from 'zod';

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().optional(),
  posts: z.array(PostSchema)
});`;
    }
  } else if (language === 'python' && style === 'dataclass') {
    return `Generate Python dataclass definitions. Include necessary imports and use proper Python typing.
Example:
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class User:
    id: int
    name: str
    email: Optional[str] = None
    posts: List['Post'] = field(default_factory=list)`;
  }
  return '';
}

/**
 * Generate fallback response when AI is unavailable
 */
function generateFallbackResponse(request: AutoTypeRequest): AutoTypeResult {
  const { language, style } = request;
  
  let code = '';
  if (language === 'typescript') {
    if (style === 'interface') {
      code = `interface ApiResponse {
  // Type inference failed - please define manually
  [key: string]: any;
}`;
    } else if (style === 'zod') {
      code = `import { z } from 'zod';

const ApiResponseSchema = z.object({
  // Type inference failed - please define manually
}).passthrough();`;
    }
  } else if (language === 'python' && style === 'dataclass') {
    code = `from dataclasses import dataclass
from typing import Any, Dict

@dataclass
class ApiResponse:
    # Type inference failed - please define manually
    data: Dict[str, Any] = None`;
  }

  return {
    language,
    style,
    code,
    notes: [
      'AI type generation failed - this is a basic fallback template',
      'Please review and customize the types based on your actual API response'
    ],
    confidence: 'low'
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
    const typeRequest: AutoTypeRequest = body;

    // Validate input
    if (!typeRequest.responseBody || !typeRequest.language || !typeRequest.style) {
      return NextResponse.json(
        { error: 'Invalid input: responseBody, language, and style are required' },
        { status: 400 }
      );
    }

    // Validate language/style combinations
    const validCombinations = {
      typescript: ['interface', 'zod'],
      python: ['dataclass']
    };

    if (!validCombinations[typeRequest.language]?.includes(typeRequest.style)) {
      return NextResponse.json(
        { error: `Invalid combination: ${typeRequest.language} does not support ${typeRequest.style}` },
        { status: 400 }
      );
    }

    // Sanitize response body
    const sanitizedBody = sanitizeForTypeGeneration(typeRequest.responseBody);

    // Check cache
    const cacheKey = await generateTypeGenerationHash(
      sanitizedBody, 
      typeRequest.language, 
      typeRequest.style
    );
    const cachedResult = typeGenerationCache.get(cacheKey);
    if (cachedResult) {
      return NextResponse.json({
        ...cachedResult,
        _cached: true,
      });
    }

    // Estimate token count
    const payloadJson = JSON.stringify(sanitizedBody);
    const estimatedTokens = estimateTokenCount(payloadJson);
    
    // Reject if payload is too large
    if (estimatedTokens > 16000) {
      return NextResponse.json(
        { error: 'Response body too large for type generation' },
        { status: 413 }
      );
    }

    // Construct user prompt
    const languagePrompt = getLanguagePrompt(typeRequest.language, typeRequest.style);
    const userPrompt = `Generate ${typeRequest.language} ${typeRequest.style} definitions from this response JSON:

${languagePrompt}

Response Body:
${JSON.stringify(sanitizedBody, null, 2)}

Generate appropriate type definitions that accurately represent this data structure.`;

    // Call OpenAI with structured output
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using gpt-4o-mini as per existing pattern
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'auto_type_generator_response',
          strict: true,
          schema: AUTO_TYPE_SCHEMA,
        },
      },
      temperature: 0.1, // Low temperature for consistent code generation
      max_tokens: 2000,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    // Parse and validate response
    let result: AutoTypeResult;
    try {
      result = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      result = generateFallbackResponse(typeRequest);
    }

    // Validate generated code syntax
    let validationResult;
    if (result.language === 'typescript') {
      validationResult = validateTypeScriptSyntax(result.code);
    } else if (result.language === 'python') {
      validationResult = validatePythonSyntax(result.code);
    }

    // If validation fails, add notes and reduce confidence
    if (validationResult && !validationResult.isValid) {
      result.notes = result.notes || [];
      result.notes.push(...validationResult.errors.map(error => `Validation warning: ${error}`));
      if (result.confidence === 'high') result.confidence = 'medium';
      if (result.confidence === 'medium') result.confidence = 'low';
    }

    // Cache the result
    typeGenerationCache.set(cacheKey, result);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('AI type generation error:', error);

    // Return fallback response on error
    let fallbackResult;
    try {
      const requestBody = await request.json();
      fallbackResult = generateFallbackResponse(requestBody as AutoTypeRequest);
    } catch {
      fallbackResult = {
        language: 'typescript' as const,
        style: 'interface' as const,
        code: 'interface ApiResponse { [key: string]: any; }',
        notes: ['Type generation failed due to server error'],
        confidence: 'low' as const
      };
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
