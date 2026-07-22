import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

function extractVideoId(value = '') {
  try {
    const url = new URL(value.trim());
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1).split('/')[0];
    if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2];
    if (url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2];
    return url.searchParams.get('v');
  } catch {
    return null;
  }
}

async function getYoutubeMetadata(url) {
  const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, {
    next: { revalidate: 3600 }
  });
  if (!response.ok) return null;
  return response.json();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getSupadataTranscript(url) {
  if (!process.env.SUPADATA_API_KEY) return null;

  const endpoint = `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(url)}&lang=en&text=true&mode=auto`;
  const response = await fetch(endpoint, {
    headers: { 'x-api-key': process.env.SUPADATA_API_KEY },
    cache: 'no-store'
  });

  const data = await response.json().catch(() => ({}));
  if (response.status === 202 && data.jobId) {
    const started = Date.now();
    while (Date.now() - started < 48000) {
      await sleep(1500);
      const jobResponse = await fetch(`https://api.supadata.ai/v1/transcript/${data.jobId}`, {
        headers: { 'x-api-key': process.env.SUPADATA_API_KEY },
        cache: 'no-store'
      });
      const job = await jobResponse.json().catch(() => ({}));
      if (job.status === 'completed' && job.content) {
        return { text: Array.isArray(job.content) ? job.content.map((part) => part.text || '').join(' ') : job.content, provider: 'Supadata AI transcript' };
      }
      if (job.status === 'failed') throw new Error(job.error || 'Video transcription failed.');
    }
    throw new Error('Video transcription is still processing. Try again in a moment or paste the transcript.');
  }

  if (!response.ok || !data.content) {
    throw new Error(data.message || data.error || 'The transcript provider could not process this video.');
  }

  return {
    text: Array.isArray(data.content) ? data.content.map((part) => part.text || '').join(' ') : data.content,
    provider: 'Supadata transcript'
  };
}

function parseJson(text) {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
}

const taxonomy = [
  'Ground Balls', 'Passing', 'Catching', 'Shooting', 'Finishing', 'Dodging',
  '1v1 Offense', 'On-Ball Defense', 'Off-Ball Defense', 'Approach', 'Footwork',
  'Stick Protection', 'Transition', 'Clearing', 'Riding', 'Sliding', 'Recovery',
  'Communication', 'Decision-Making', 'Spacing', 'Ball Movement', 'Cutting',
  'Faceoffs', 'Goalie Play', 'Man-Up', 'Man-Down', 'Conditioning', 'Team Culture'
];

const systemPrompt = `You are the CoachVault Engine, a specialist lacrosse coaching analyst.
Transform raw coaching content into a structured, editable coaching asset.

CORE JUDGMENT:
Determine WHY a coach would save this resource. Tag purpose, not every action that appears.
A drill does not earn Ground Balls merely because a player scoops a ball. It earns Ground Balls when ground-ball technique, approach, competition, possession, recovery, or the decision after possession is a central teaching objective.
A drill does not earn Passing merely because passes occur. It earns Passing when mechanics, timing, accuracy, communication, tempo, or passing decisions are central objectives.
A drill does not earn 1v1 merely because an attacker encounters a defender. It earns 1v1 when winning the individual matchup, dodging, leverage, approach, footwork, or on-ball defense is central.

PURPOSE TAG WEIGHTS:
90-100 = core purpose; removing it would fundamentally change the drill.
70-89 = major purpose; clearly coached and evaluated.
45-69 = supporting purpose; meaningfully trained but not central.
Below 45 = incidental; omit it from purposeTags.
Use no more than 6 purpose tags per asset and no more than 4 per drill. Prefer fewer, stronger tags.
Every retained tag must include a brief evidence-based reason.

CONTROLLED TAXONOMY:
Prefer these labels: ${taxonomy.join(', ')}.
Only create a new label when none of these accurately describes the purpose.

SEPARATION:
Purpose tags describe coaching intent. Context describes age, equipment, player count, field area, format, and difficulty. Do not use context as purpose tags.

SOURCE DISCIPLINE:
Separate source-stated facts from reasonable inference. Never invent missing details. Use null, an empty list, or "Not specified" when unsupported.
When a source contains multiple distinct drills or sections, break them out separately.
Return only valid JSON.`;

function buildPrompt({ title, sourceUrl, content }) {
  return `Analyze this coaching source for CoachVault.

SOURCE TITLE: ${title || 'Untitled source'}
SOURCE URL: ${sourceUrl || 'None'}
SOURCE CONTENT:
${content.slice(0, 90000)}

Return exactly this JSON shape:
{
  "title": "concise editable title",
  "resourceType": "Drill | Practice Plan | Coaching Concept | Team Talk | Video Analysis | Document | Other",
  "summary": "2-4 sentence coach-facing summary",
  "primaryPurpose": "one sentence describing what this content is fundamentally trying to teach",
  "purposeTags": [
    {"name":"Ground Balls","weight":94,"reason":"specific evidence explaining why this is a purpose rather than an incidental action"}
  ],
  "omittedTags": [
    {"name":"Passing","estimatedWeight":28,"reason":"passes occur but are not taught or evaluated"}
  ],
  "context": {
    "ageGroups": ["U12"],
    "difficulty": "Beginner | Intermediate | Advanced | Mixed | Not specified",
    "estimatedDurationMinutes": null,
    "playerCount": "string or Not specified",
    "equipment": ["balls"],
    "fieldArea": "string or Not specified",
    "format": "Individual | Partner | Small-Sided | Team | Station | Progression | Mixed | Not specified"
  },
  "coachingPoints": ["specific cue supported by the source"],
  "commonMistakes": ["mistake stated or strongly implied by the instruction"],
  "drills": [
    {
      "name":"drill or segment name",
      "purpose":"what this drill specifically teaches",
      "setup":"concise setup or Not specified",
      "steps":["step 1"],
      "coachingPoints":["cue"],
      "purposeTags":[{"name":"1v1 Offense","weight":92,"reason":"central matchup objective"}]
    }
  ],
  "engineReport": {
    "itemsFound":"brief count summary",
    "strongestInsight":"the most valuable coaching interpretation",
    "reviewWarnings":["anything the coach should verify"]
  },
  "suggestedVaultAsset": {
    "saveAs":"Drill | Practice Plan | Coaching Concept | Video Analysis | Document",
    "recommendedNextStep":"what the coach should do next"
  },
  "confidence": {
    "overall": 0,
    "notes":"what limited confidence"
  }
}`;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const mode = body.mode || 'link';
    let title = body.title || '';
    const sourceUrl = body.url || '';
    let content = body.transcript || body.text || '';
    let sourceMeta = {};

    if (mode === 'link') {
      const videoId = extractVideoId(sourceUrl);
      if (!videoId) {
        return NextResponse.json({ error: 'This Engine test currently accepts a public YouTube video URL.' }, { status: 400 });
      }

      const metadata = await getYoutubeMetadata(sourceUrl).catch(() => null);
      title = metadata?.title || title || 'YouTube coaching video';
      sourceMeta = {
        platform: 'YouTube',
        author: metadata?.author_name || 'Unknown creator',
        thumbnail: metadata?.thumbnail_url || '',
        videoId,
        transcriptProvider: content.trim() ? 'Coach-provided transcript' : ''
      };

      if (!content.trim()) {
        try {
          const transcriptResult = await getSupadataTranscript(sourceUrl);
          if (!transcriptResult) {
            return NextResponse.json({
              error: 'Automatic YouTube transcription is not configured yet. Add SUPADATA_API_KEY in Vercel, or paste the transcript for the same Engine analysis.',
              sourceMeta,
              transcriptUnavailable: true
            }, { status: 422 });
          }
          content = transcriptResult.text;
          sourceMeta.transcriptProvider = transcriptResult.provider;
        } catch (error) {
          return NextResponse.json({
            error: `${error.message} You can still paste the transcript and run the Engine immediately.`,
            sourceMeta,
            transcriptUnavailable: true
          }, { status: 422 });
        }
      }
    }

    if (!content.trim()) {
      return NextResponse.json({ error: 'No readable content was provided for analysis.' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        error: 'OPENAI_API_KEY is not configured in Vercel. Add it under Project Settings → Environment Variables, then redeploy.'
      }, { status: 503 });
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        instructions: systemPrompt,
        input: buildPrompt({ title, sourceUrl, content }),
        temperature: 0.15
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data?.error?.message || 'The AI analysis request failed.' }, { status: response.status });
    }

    const outputText = data.output_text || data.output?.flatMap((item) => item.content || []).map((item) => item.text || '').join('') || '';
    const analysis = parseJson(outputText);

    return NextResponse.json({
      analysis,
      sourceMeta,
      source: {
        title,
        url: sourceUrl,
        transcriptCharacters: content.length
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'CoachVault Engine encountered an unexpected error.' }, { status: 500 });
  }
}
