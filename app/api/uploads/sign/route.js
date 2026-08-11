import { issueSignedToken, presignUrl } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { assertCoachVaultBlobToken, blobTokenFingerprint, blobTokenSource } from '../../../lib/blobServer';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/octet-stream'
]);

function safeFilename(name='upload') {
  return String(name)
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(-140) || 'upload';
}

export async function POST(request) {
  const blobToken = assertCoachVaultBlobToken();
  const tokenFingerprint = blobTokenFingerprint(blobToken);
  const tokenSource = blobTokenSource();
  try {
    const { filename, contentType, size } = await request.json();
    const numericSize = Number(size || 0);

    if (!filename) {
      return NextResponse.json({ error:'A filename is required.' }, { status:400 });
    }

    if (!numericSize || numericSize > MAX_FILE_SIZE) {
      return NextResponse.json({
        error:'CoachVault currently supports documents up to 10 MB.'
      }, { status:413 });
    }

    const normalizedType = contentType || 'application/octet-stream';
    if (!ALLOWED_TYPES.has(normalizedType)) {
      return NextResponse.json({
        error:`${normalizedType} is not currently supported for CoachVault document ingestion.`
      }, { status:400 });
    }

    const pathname = `coachvault-ingestion/${Date.now()}-${crypto.randomUUID()}-${safeFilename(filename)}`;
    const validUntil = Date.now() + 15 * 60 * 1000;

    const token = await issueSignedToken({
      token:blobToken,
      pathname,
      operations:['put'],
      allowedContentTypes:[normalizedType],
      maximumSizeInBytes:MAX_FILE_SIZE
    });

    const { presignedUrl } = await presignUrl(token, {
      pathname,
      operation:'put',
      validUntil
    });

    return NextResponse.json({
      uploadUrl:presignedUrl,
      pathname,
      expiresAt:new Date(validUntil).toISOString(),
      storage:'Private Vercel Blob'
    });
  } catch (error) {
    const message =
      error?.message ||
      error?.details ||
      error?.error?.message ||
      String(error || 'Private upload signing failed.');

    return NextResponse.json({
      error:`CoachVault could not create a secure private upload URL. ${message}`
    }, { status:500 });
  }
}
