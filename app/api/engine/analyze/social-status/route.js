import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

function errorText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message || String(value);

  if (typeof value === 'object') {
    const candidates = [
      value.message,
      value.details,
      value.detail,
      value.error_description,
      value.error?.message,
      value.error?.details,
      value.error
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }
    try { return JSON.stringify(value); } catch (_) {}
  }

  return String(value);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function supadataFetch(url, options={}, retries=4) {
  let response;
  for (let attempt=0; attempt<=retries; attempt++) {
    response = await fetch(url, options);
    if (response.status !== 429) return response;

    const retryAfter = Number(response.headers.get('retry-after') || 0);
    const wait = Math.max(1200 * Math.pow(2, attempt), retryAfter * 1000);
    await sleep(Math.min(wait, 9000));
  }
  return response;
}

export async function POST(request) {
  try {
    const { jobId, url } = await request.json();
    const key = process.env.SUPADATA_API_KEY;

    if (!jobId || !url) {
      return NextResponse.json({ error:'Missing social-video analysis job.' }, { status:400 });
    }
    if (!key) {
      return NextResponse.json({ error:'SUPADATA_API_KEY is not configured.' }, { status:500 });
    }

    const poll = await supadataFetch(
      `https://api.supadata.ai/v1/extract/${encodeURIComponent(jobId)}`,
      { headers:{ 'x-api-key':key } },
      4
    );

    if (poll.status === 429) {
      return NextResponse.json({
        status:'processing',
        message:'The video service is busy. CoachVault is backing off and will keep checking automatically.'
      }, { status:202 });
    }

    if (!poll.ok) {
      return NextResponse.json({
        error:`The video service returned ${poll.status} while checking the analysis job.`
      }, { status:poll.status });
    }

    const result = await poll.json();

    if (result.status === 'failed') {
      return NextResponse.json({
        error:errorText(result.error) || 'Social video analysis failed.'
      }, { status:400 });
    }

    if (result.status !== 'completed') {
      return NextResponse.json({
        status:'processing',
        message:'Reading the full video, on-screen text, and coaching actions…'
      }, { status:202 });
    }

    // Return the completed evidence to the authenticated browser.
    // The browser will submit it to CoachVault's normal relative analysis route,
    // avoiding a server-to-server call that Vercel Deployment Protection can block.
    return NextResponse.json({
      status:'completed',
      jobId,
      url,
      evidence:result.data || {},
      message:'Full social video analysis is complete.'
    });
  } catch (error) {
    return NextResponse.json({ error:errorText(error) || 'Unexpected social-video polling error.' }, { status:500 });
  }
}
