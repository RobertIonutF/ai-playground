import { NextRequest, NextResponse } from 'next/server';
import { parseApiDocumentation, validateParsedDoc } from '@/lib/api-parser';
import { generateContextId } from '@/lib/context-store';
import { ApiContext } from '@/types/api';

export const maxDuration = 30;

/**
 * POST /api/context/upload
 * Accepts uploaded file and parses it
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, filename } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'File content is required' },
        { status: 400 }
      );
    }

    // Check file size (max 2MB)
    const contentString = typeof content === 'string' ? content : JSON.stringify(content);
    const sizeInBytes = new Blob([contentString]).size;
    
    if (sizeInBytes > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large (max 2MB)' },
        { status: 413 }
      );
    }

    // Parse the documentation
    let parsed;
    try {
      parsed = parseApiDocumentation(content);
    } catch (parseError: any) {
      return NextResponse.json(
        { 
          error: 'Failed to parse documentation',
          details: parseError.message,
          hint: 'Make sure the file is in OpenAPI, Swagger, or Postman format'
        },
        { status: 400 }
      );
    }

    // Validate parsed result
    const validation = validateParsedDoc(parsed);
    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: 'Invalid documentation structure',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Create API context
    const now = Date.now();
    const apiContext: ApiContext = {
      id: generateContextId(),
      name: parsed.metadata.title || filename || 'Uploaded API',
      baseUrl: parsed.baseUrl,
      sourceType: parsed.metadata.sourceType,
      version: parsed.metadata.version,
      description: parsed.metadata.description,
      endpoints: parsed.endpoints,
      lastUpdated: now,
      createdAt: now,
    };

    return NextResponse.json({
      success: true,
      context: apiContext,
      stats: {
        endpointCount: apiContext.endpoints.length,
        sourceType: apiContext.sourceType,
      },
    });

  } catch (error: any) {
    console.error('API context upload error:', error);

    return NextResponse.json(
      {
        error: 'Failed to process uploaded file',
        details: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

