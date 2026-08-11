import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    product:'CoachVault',
    engineVersion:'3.10.7',
    build:'3107-BLOB',
    blobRecovery:'explicit shared Blob token + store diagnostics + OpenAI Files API',
    expectedWorkspaceLabel:'Engine 3.10.7 · BUILD 3107-BLOB'
  }, {
    headers:{
      'Cache-Control':'no-store, no-cache, must-revalidate'
    }
  });
}
