import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const hasLegacyToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const hasOidc = Boolean(process.env.VERCEL_OIDC_TOKEN);
  const runningOnVercel = Boolean(process.env.VERCEL);

  return NextResponse.json({
    configured: hasLegacyToken || hasOidc,
    runningOnVercel,
    authMode: hasOidc ? 'OIDC' : hasLegacyToken ? 'Read/write token' : 'No Blob credential detected',
    storageMode:'Private Blob',
    guidance: (hasLegacyToken || hasOidc)
      ? 'Private Blob authentication is visible to this deployment.'
      : 'Connect the private Blob store to this Vercel project/environment and redeploy.'
  });
}
