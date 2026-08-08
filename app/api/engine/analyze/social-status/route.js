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

    // Feed completed full-video evidence through CoachVault's normal CVIL analysis.
    const origin = new URL(request.url).origin;
    const evidence = JSON.stringify(result.data || {}, null, 2);

    // Wait before the next API/service operation to avoid burst behavior.
    await sleep(1200);

    const analyze = await fetch(`${origin}/api/engine/analyze`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body:JSON.stringify({
        mode:'text',
        text:[
          'FULL SOCIAL VIDEO VISUAL/AUDIO EXTRACTION:',
          evidence,
          '',
          `ORIGINAL SOCIAL SOURCE URL: ${url}`,
          '',
          'This is evidence from the full video. Prioritize on-screen instructional text and repeated demonstrated actions. Preserve named variations. Do not invent setup details that are not supported.'
        ].join('\n')
      })
    });

    const raw = await analyze.text();
    let data;
    try { data = JSON.parse(raw); }
    catch (_) {
      return NextResponse.json({ error:raw || 'CoachVault could not interpret the completed video evidence.' }, { status:500 });
    }

    if (!analyze.ok) return NextResponse.json(data, { status:analyze.status });

    data.sourceMeta = {
      ...(data.sourceMeta || {}),
      platform:'Social Video',
      url,
      accessStatus:'Full social video analyzed',
      sourceMethod:'Supadata asynchronous full-video intelligence'
    };

    if (data.diagnostics) {
      data.diagnostics.recognizedSource = {
        platform:'Social Video',
        method:'Asynchronous full-video intelligence',
        accessStatus:'Full video analyzed',
        fullVideoAnalyzed:true,
        videoExtractionJobId:jobId
      };
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error:errorText(error) || 'Unexpected social-video polling error.' }, { status:500 });
  }
}
