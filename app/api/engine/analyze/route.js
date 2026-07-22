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

function decodeXml(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

async function getYoutubeTranscript(videoId) {
  const languages = ['en', 'en-US', 'en-GB'];
  for (const lang of languages) {
    const response = await fetch(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=${encodeURIComponent(lang)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 CoachVault/0.5' },
      cache: 'no-store'
    });
    if (!response.ok) continue;
    const xml = await response.text();
    if (!xml.includes('<text')) continue;
    const transcript = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)]
      .map((match) => decodeXml(match[1].replace(/<[^>]+>/g, ' ')))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (transcript) return transcript;
  }
  throw new Error('Transcript unavailable');
}

function parseJson(text) {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
}

const systemPrompt = `You are the CoachVault Engine, a specialist lacrosse coaching analyst.
Your job is to transform raw coaching content into a structured, editable coaching asset.

TAGGING PRINCIPLE:
Tags describe the PRIMARY PURPOSE of the content, not every action or object that happens to appear.
Do not tag Ground Balls merely because players pick up a ball. Use Ground Balls only when ground-ball technique, decision-making, competition, recovery, or transition from a ground ball is a central teaching objective.
Do not tag Passing merely because passes occur. Use Passing only when passing mechanics, timing, accuracy, communication, tempo, or decision-making are central objectives.
Do not tag 1v1 merely because one offensive player meets one defender. Use 1v1 only when dodging, on-ball defense, leverage, approach, footwork, or winning an individual matchup is a central objective.
Apply the same standard to all tags.

TAG WEIGHTS:
- 90-100 Core purpose: the content is explicitly designed to teach this.
- 70-89 Major purpose: a major coaching objective but not the only one.
- 45-69 Supporting purpose: meaningfully trained or emphasized.
- Below 45 should usually be omitted.
Return no more than 8 purpose tags. Prefer fewer, stronger tags.

Separate PURPOSE TAGS from CONTEXT metadata such as age group, equipment, format, and field area.
When the source contains multiple distinct drills or sections, identify them separately.
Never invent details that are not supported. Mark uncertain values clearly.
Return only valid JSON.`;

function buildPrompt({ title, sourceUrl, transcript, pastedText }) {
  const sourceText = (transcript || pastedText || '').slice(0, 70000);
  return `Analyze this coaching source for CoachVault.

SOURCE TITLE: ${title || 'Untitled source'}
SOURCE URL: ${sourceUrl || 'None'}
SOURCE CONTENT:
${sourceText}

Return this exact JSON shape:
{
  "title": "concise editable title",
  "resourceType": "Drill | Practice Plan | Coaching Concept | Team Talk | Video Analysis | Document | Other",
  "summary": "2-4 sentence coach-facing summary",
  "primaryPurpose": "one sentence describing what this content is fundamentally trying to teach",
  "purposeTags": [
    {"name":"Passing","weight":88,"reason":"brief evidence-based reason"}
  ],
  "context": {
    "ageGroups": ["U10"],
    "difficulty": "Beginner | Intermediate | Advanced | Mixed | Not specified",
    "estimatedDurationMinutes": null,
    "playerCount": "string or Not specified",
    "equipment": ["balls"],
    "fieldArea": "string or Not specified"
  },
  "coachingPoints": ["specific cue"],
  "drills": [
    {
      "name":"drill or segment name",
      "purpose":"what this drill specifically teaches",
      "setup":"concise setup",
      "steps":["step 1"],
      "coachingPoints":["cue"],
      "purposeTags":[{"name":"1v1","weight":92,"reason":"central matchup objective"}]
    }
  ],
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
    let sourceUrl = body.url || '';
    let transcript = body.transcript || '';
    let sourceMeta = {};

    if (mode === 'link') {
      const videoId = extractVideoId(sourceUrl);
      if (!videoId) {
        return NextResponse.json({ error: 'v0.5 currently supports YouTube links for live Engine testing.' }, { status: 400 });
      }

      const metadata = await getYoutubeMetadata(sourceUrl).catch(() => null);
      title = metadata?.title || title || 'YouTube coaching video';
      sourceMeta = {
        platform: 'YouTube',
        author: metadata?.author_name || 'Unknown creator',
        thumbnail: metadata?.thumbnail_url || '',
        videoId
      };

      if (!transcript.trim()) {
        try {
          transcript = await getYoutubeTranscript(videoId);
        } catch (error) {
          return NextResponse.json({
            error: 'CoachVault could not retrieve this video transcript. Paste the transcript in the optional transcript box and run the Engine again.',
            sourceMeta,
            transcriptUnavailable: true
          }, { status: 422 });
        }
      }
    }

    const content = transcript || body.text || '';
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
        input: buildPrompt({ title, sourceUrl, transcript: content, pastedText: body.text }),
        temperature: 0.2
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
