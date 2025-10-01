import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30; // Maximum duration for the request (30 seconds)

export async function POST(request: NextRequest) {
  try {
    let body;
    
    // Handle empty request bodies gracefully
    try {
      body = await request.json();
    } catch (error) {
      // If JSON parsing fails due to empty body, use empty object
      body = {};
    }
    
    const { method, url, headers, body: requestBody } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
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

    const startTime = Date.now();

    // Make the actual request
    const fetchOptions: RequestInit = {
      method: method || 'GET',
      headers: headers || {},
    };

    // Add body if method supports it
    if (requestBody && !['GET', 'HEAD'].includes(method)) {
      fetchOptions.body = requestBody;
    }

    const response = await fetch(url, fetchOptions);
    const responseTime = Date.now() - startTime;

    // Get response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Try to parse response as JSON, fallback to text
    let data;
    const contentType = response.headers.get('content-type') || '';
    
    try {
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } catch {
      data = await response.text();
    }

    // Calculate response size
    const responseText = typeof data === 'string' ? data : JSON.stringify(data);
    const size = new Blob([responseText]).size;

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data,
      responseTime,
      size,
    });

  } catch (error: any) {
    console.error('API proxy error:', error);
    
    return NextResponse.json(
      {
        status: 0,
        statusText: 'Request Failed',
        headers: {},
        data: {
          error: error.message || 'Failed to complete request',
          type: error.name || 'Error',
        },
        responseTime: 0,
        size: 0,
      },
      { status: 200 } // Return 200 so we can display the error in the UI
    );
  }
}

