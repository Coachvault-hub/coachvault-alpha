import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ENGINE_VERSION = '1.0.0';

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

const systemPrompt = `You are CoachVault Engine 1.0, a specialist lacrosse coaching analyst.
Your job is not to summarize content. Your job is to convert coaching knowledge into a reliable, editable knowledge asset.

ANALYSIS STAGES:
1. Identify the resource type and whether it contains one or multiple assets.
2. Identify the player or team problem the resource is designed to solve.
3. Determine the primary teaching purpose.
4. Separate core coaching concepts from incidental actions.
5. Extract setup, execution, teaching cues, mistakes, progressions, regressions, and constraints.
6. Mark what is source-stated, inferred, or unknown.
7. Recommend how the asset should live inside the Vault.

QUALITY RULE:
A useful result should help another coach teach the material without watching or reading the original source, while never inventing unsupported details.


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
  "engineVersion": "1.0.0",
  "title": "concise editable title",
  "resourceType": "Drill | Practice Plan | Coaching Concept | Team Talk | Video Analysis | Document | Other",
  "summary": "2-4 sentence coach-facing summary",
  "coachingProblem": "the player or team problem this resource is designed to solve, or Not specified",
  "primaryPurpose": "one sentence describing what this content is fundamentally trying to teach",
  "purposeTags": [
    {"name":"Ground Balls","weight":94,"role":"Core | Major | Supporting","reason":"specific evidence explaining why this is a purpose rather than an incidental action"}
  ],
  "omittedTags": [
    {"name":"Passing","estimatedWeight":28,"reason":"passes occur but are not taught or evaluated"}
  ],
  "coachingConcepts": [
    {"name":"Run through the ball","category":"Technique | Decision | Team Concept | Behavior | Mindset","importance":"Core | Major | Supporting","evidence":"what in the source supports this concept"}
  ],
  "context": {
    "ageGroups": ["U12"],
    "difficulty": "Beginner | Intermediate | Advanced | Mixed | Not specified",
    "estimatedDurationMinutes": null,
    "playerCount": "string or Not specified",
    "equipment": ["balls"],
    "fieldArea": "string or Not specified",
    "format": "Individual | Partner | Small-Sided | Team | Station | Progression | Mixed | Not specified",
    "contactLevel": "None | Light | Controlled | Full | Not specified"
  },
  "teachingModel": {
    "coachingPoints": ["specific cue supported by the source"],
    "commonMistakes": ["mistake stated or strongly implied"],
    "successIndicators": ["observable sign that the drill is working"],
    "progressions": ["how to make it more demanding"],
    "regressions": ["how to simplify it"],
    "safetyNotes": ["source-supported safety concern"]
  },
  "drills": [
    {
      "name":"drill or segment name",
      "purpose":"what this drill specifically teaches",
      "coachingProblem":"the issue it addresses",
      "setup":"concise setup or Not specified",
      "steps":["step 1"],
      "coachingPoints":["cue"],
      "commonMistakes":["mistake"],
      "progressions":["progression"],
      "purposeTags":[{"name":"1v1 Offense","weight":92,"role":"Core","reason":"central matchup objective"}]
    }
  ],
  "knowledgeLinks": {
    "prerequisites": ["skills or concepts players should already understand"],
    "relatedConcepts": ["closely connected coaching ideas"],
    "nextResourcesToFind": ["what would logically complement this asset"]
  },
  "sourceDiscipline": {
    "statedFacts": ["important facts directly stated in the source"],
    "inferences": ["reasonable interpretations that should be coach-reviewed"],
    "unknowns": ["missing information that must not be invented"]
  },
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
    "purpose": 0,
    "setup": 0,
    "teachingModel": 0,
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
      analysis: { ...analysis, engineVersion: analysis.engineVersion || ENGINE_VERSION },
      engineVersion: ENGINE_VERSION,
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
