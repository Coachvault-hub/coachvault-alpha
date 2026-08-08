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
    return NextResponse.json(
      { error: error?.message || 'Large file upload could not be authorized.' },
      { status: 400 }
    );
  }
}
