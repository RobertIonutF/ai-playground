import { NextRequest, NextResponse } from 'next/server';
import { parseApiDocumentation, validateParsedDoc } from '@/lib/api-parser';
import { generateContextId } from '@/lib/context-store';
import { ApiContext } from '@/types/api';

export const maxDuration = 30;

/**
 * POST /api/context/fetch
 * Fetches documentation from a URL and parses it
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Security: Block local/private network requests
    const hostname = targetUrl.hostname.toLowerCase();
    const blockedHosts = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      '169.254.',
      '10.',
      '172.16.',
      '192.168.',
    ];

    if (blockedHosts.some(blocked => hostname.includes(blocked))) {
      return NextResponse.json(
        { error: 'Requests to local/private networks are not allowed' },
        { status: 403 }
      );
    }

    // Fetch the document
    const startTime = Date.now();
    
    const fetchResponse = await fetch(url, {
      headers: {
        'Accept': 'application/json, application/yaml, text/html, text/plain, */*',
        'User-Agent': 'API-Playground/1.0',
      },
      signal: AbortSignal.timeout(20000), // 20 second timeout
    });

    if (!fetchResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch documentation: ${fetchResponse.statusText}` },
        { status: fetchResponse.status }
      );
    }

    // Get content type
    const contentType = fetchResponse.headers.get('content-type') || '';
    
    // Read response
    let content: any;
    if (contentType.includes('application/json')) {
      content = await fetchResponse.json();
    } else if (contentType.includes('application/yaml') || contentType.includes('text/yaml') || url.endsWith('.yaml') || url.endsWith('.yml')) {
      // For YAML, we'll try to parse as text first
      const text = await fetchResponse.text();
      // Note: In production, use a YAML parser like js-yaml
      // For now, attempt JSON parse as many YAML APIs also support JSON
      try {
        content = JSON.parse(text);
      } catch {
        // If it's actual YAML, return error asking for JSON endpoint
        return NextResponse.json(
          { 
            error: 'YAML parsing not yet supported. Please use a JSON endpoint or convert to JSON.',
            hint: 'Many APIs provide JSON versions of their OpenAPI specs.'
          },
          { status: 400 }
        );
      }
    } else {
      content = await fetchResponse.text();
    }

    // Check file size (max 2MB)
    const contentString = typeof content === 'string' ? content : JSON.stringify(content);
    const sizeInBytes = new Blob([contentString]).size;
    
    if (sizeInBytes > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Documentation file too large (max 2MB)' },
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
      name: parsed.metadata.title || `API from ${new URL(url).hostname}`,
      baseUrl: parsed.baseUrl,
      sourceUrl: url,
      sourceType: parsed.metadata.sourceType,
      version: parsed.metadata.version,
      description: parsed.metadata.description,
      endpoints: parsed.endpoints,
      lastUpdated: now,
      createdAt: now,
    };

    const fetchTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      context: apiContext,
      stats: {
        endpointCount: apiContext.endpoints.length,
        fetchTimeMs: fetchTime,
        sourceType: apiContext.sourceType,
      },
    });

  } catch (error: any) {
    console.error('API context fetch error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch and parse documentation',
        details: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

