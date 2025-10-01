import { NextRequest, NextResponse } from 'next/server';
import { setActiveContext, saveContext } from '@/lib/context-store';
import { ApiContext } from '@/types/api';

/**
 * POST /api/context/set
 * Sets the active context or saves a new one
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contextId, context } = body;

    // If context is provided, save it first
    if (context) {
      const apiContext: ApiContext = context;
      saveContext(apiContext);
      
      // Automatically set it as active
      setActiveContext(apiContext.id);

      return NextResponse.json({
        success: true,
        message: 'Context saved and set as active',
        contextId: apiContext.id,
      });
    }

    // If only contextId is provided, set it as active
    if (contextId) {
      try {
        setActiveContext(contextId);

        return NextResponse.json({
          success: true,
          message: 'Active context updated',
          contextId,
        });
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }

    // If contextId is null, clear active context
    if (contextId === null) {
      setActiveContext(null);

      return NextResponse.json({
        success: true,
        message: 'Active context cleared',
        contextId: null,
      });
    }

    return NextResponse.json(
      { error: 'Either contextId or context must be provided' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('API context set error:', error);

    return NextResponse.json(
      {
        error: 'Failed to set context',
        details: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

