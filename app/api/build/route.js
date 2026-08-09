import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    product:'CoachVault',
    engineVersion:'3.10.6',
    build:'3106-A',
    blobRecovery:'retry + private list() discovery + OpenAI Files API',
    expectedWorkspaceLabel:'Engine 3.10.6 · BUILD 3106-A'
  }, {
    headers:{
      'Cache-Control':'no-store, no-cache, must-revalidate'
    }
  });
}
