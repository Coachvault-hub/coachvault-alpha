import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import {
  getCoachVaultBlobToken,
  blobTokenFingerprint,
  blobTokenSource
} from '../../lib/blobServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  const token = getCoachVaultBlobToken();
  const tokenId = blobTokenFingerprint(token);
  const tokenEnv = blobTokenSource();

  if (!token) {
    return NextResponse.json({
      ok:false,
      engineVersion:'3.10.7',
      build:'3107-BLOB',
      tokenPresent:false,
      tokenSource:tokenEnv,
      tokenFingerprint:tokenId,
      error:'No CoachVault Blob read/write token is available to this deployment.'
    }, { status:500, headers:{'Cache-Control':'no-store'} });
  }

  try {
    const result = await list({
      token,
      access:'private',
      prefix:'coachvault-ingestion/',
      limit:20
    });

    return NextResponse.json({
      ok:true,
      engineVersion:'3.10.7',
      build:'3107-BLOB',
      tokenPresent:true,
      tokenSource:tokenEnv,
      tokenFingerprint:tokenId,
      ingestionBlobCount:Array.isArray(result?.blobs) ? result.blobs.length : 0,
      recentBlobs:(result?.blobs || []).slice(0,10).map(blob => ({
        pathname:blob.pathname,
        size:blob.size,
        uploadedAt:blob.uploadedAt,
        urlHost:(() => {
          try { return new URL(blob.url).host; } catch (_) { return null; }
        })()
      }))
    }, {
      headers:{'Cache-Control':'no-store, no-cache, must-revalidate'}
    });
  } catch (error) {
    return NextResponse.json({
      ok:false,
      engineVersion:'3.10.7',
      build:'3107-BLOB',
      tokenPresent:true,
      tokenSource:tokenEnv,
      tokenFingerprint:tokenId,
      error:error?.message || String(error || ''),
      stage:'blob-status-list'
    }, { status:500, headers:{'Cache-Control':'no-store'} });
  }
}
