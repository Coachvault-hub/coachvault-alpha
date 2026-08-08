import { handleUpload } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request) {
  try {
    const body = await request.json();

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const lower = String(pathname || '').toLowerCase();

        const allowed =
          lower.endsWith('.pdf') ||
          lower.endsWith('.txt') ||
          lower.endsWith('.png') ||
          lower.endsWith('.jpg') ||
          lower.endsWith('.jpeg') ||
          lower.endsWith('.webp') ||
          lower.endsWith('.doc') ||
          lower.endsWith('.docx') ||
          lower.endsWith('.ppt') ||
          lower.endsWith('.pptx');

        if (!allowed) {
          throw new Error('Unsupported CoachVault file type.');
        }

        return {
          tokenPayload: JSON.stringify({
            purpose:'coachvault-engine-ingestion',
            createdAt:new Date().toISOString()
          }),
          allowedContentTypes: [
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
          ],
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: true
        };
      },
      onUploadCompleted: async () => {
        // Analysis begins immediately after upload from the client.
        // Database/storage lifecycle management comes in the ingestion queue sprint.
      }
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const raw = String(error?.message || error || '');
    const authProblem =
      /Failed to retrieve the client token|BLOB_READ_WRITE_TOKEN|OIDC|token/i.test(raw);

    return NextResponse.json(
      {
        error: authProblem
          ? 'Large-file storage is not connected correctly to this CoachVault deployment. Open the Vercel Blob store, confirm this production project is connected, upgrade the connection to OIDC if offered, and redeploy.'
          : (raw || 'Large file upload could not be authorized.'),
        code: authProblem ? 'BLOB_CONNECTION_REQUIRED' : 'BLOB_UPLOAD_AUTH_FAILED'
      },
      { status: 400 }
    );
  }
}
