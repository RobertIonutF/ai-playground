import { NextResponse } from 'next/server';
import { getAllContexts, getActiveContext } from '@/lib/context-store';

/**
 * GET /api/context/list
 * Returns all saved contexts
 */
export async function GET() {
  try {
    const contexts = getAllContexts();
    const activeContext = getActiveContext();

    return NextResponse.json({
      success: true,
      contexts,
      activeContextId: activeContext?.id || null,
      count: contexts.length,
    });

  } catch (error: any) {
    console.error('API context list error:', error);

    return NextResponse.json(
      {
        error: 'Failed to retrieve contexts',
        details: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

