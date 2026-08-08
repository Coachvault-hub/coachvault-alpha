import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const maxDuration = 60;

function loadCVIL() {
  const dir = path.join(process.cwd(), 'standards');
  const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
  return index.skills.map((entry) => JSON.parse(fs.readFileSync(path.join(dir, entry.file), 'utf8')));
}

function compactStandard(skill) {
  return {
    id: skill.id,
    name: skill.name,
    category: skill.category,
    definition: skill.definition,
    components: skill.components.map((component) => ({
      id: component.id,
      name: component.name,
      purpose: component.purpose,
      objectives: component.objectives.map((objective) => ({
        id: objective.id,
        name: objective.name,
        observableBehaviors: objective.observableBehaviors,
        coachingCues: objective.coachingCues,
        commonMistakes: objective.commonMistakes,
        corrections: objective.corrections
      }))
    }))
  };
}

function normalizeList(value) {
  return Array.isArray(value) ? value : [];
}

function reconcileAgainstCVIL(analysis, standards) {
  const skill = standards.find((item) => item.name === analysis?.primarySkill?.name);
  if (!skill) return analysis;

  const componentMap = new Map(skill.components.map((component) => [component.name.toLowerCase(), component]));
  const validComponents = [];

  for (const component of normalizeList(analysis.components || analysis.skillComponents)) {
    const matched = componentMap.get(String(component.name || '').toLowerCase());
    if (!matched) continue;

    const objectiveMap = new Map(matched.objectives.map((objective) => [objective.name.toLowerCase(), objective]));
    const validObjectives = normalizeList(component.objectives).filter((objective) =>
      objectiveMap.has(String(objective.name || '').toLowerCase())
    );

    validComponents.push({
      name: matched.name,
      weight: Math.max(0, Math.min(100, Number(component.weight || 0))),
      reason: component.reason || '',
      objectives: validObjectives.map((objective) => ({
        name: objectiveMap.get(objective.name.toLowerCase()).name,
        weight: Math.max(0, Math.min(100, Number(objective.weight || 0))),
        reason: objective.reason || ''
      }))
    });
  }

  analysis.components = validComponents;
  analysis.skillComponents = validComponents.map(({ name, weight, reason }) => ({ name, weight, reason }));
  return analysis;
}

function buildDiagnostics({ analysis, sourceText, model, transcriptSource, standards }) {
  const matchedSkill = standards.find((skill) => skill.name === analysis?.primarySkill?.name);
  const components = normalizeList(analysis?.components);
  const objectiveCount = components.reduce((sum, component) => sum + normalizeList(component.objectives).length, 0);

  return {
    engineVersion: analysis.engineVersion,
    generatedAt: new Date().toISOString(),
    model,
    transcriptSource,
    sourceCharacters: sourceText.length,
    matchedStandard: matchedSkill ? matchedSkill.id : null,
    standardsAvailable: standards.map((skill) => skill.name),
    stages: [
      { name:'1. Source acquired', status:'pass', detail:`${sourceText.length.toLocaleString()} source characters acquired.` },
      { name:'2. CVIL loaded', status:'pass', detail:`${standards.length} skill standards available.` },
      { name:'3. Primary skill matched', status:matchedSkill?'pass':'warn', detail:matchedSkill?`Matched ${matchedSkill.name}.`:'No CVIL standard matched.' },
      { name:'4. Components matched', status:components.length?'pass':'warn', detail:`${components.length} standardized components returned.` },
      { name:'5. Objectives matched', status:objectiveCount?'pass':'warn', detail:`${objectiveCount} standardized objectives returned.` },
      { name:'6. Evidence attached', status:normalizeList(analysis.evidence).length?'pass':'warn', detail:`${normalizeList(analysis.evidence).length} evidence items returned.` }
    ],
    fieldChecks: [
      { field:'Primary skill', status:matchedSkill?'pass':'warn', detail:analysis?.primarySkill?.name || 'Missing' },
      { field:'Components', status:components.length?'pass':'warn', detail:components.map(x => `${x.name} (${x.weight})`).join(', ') || 'Missing' },
      { field:'Objectives', status:objectiveCount?'pass':'warn', detail:`${objectiveCount} matched objectives` },
      { field:'Evidence', status:normalizeList(analysis.evidence).length?'pass':'warn', detail:`${normalizeList(analysis.evidence).length} evidence items` }
    ],
    missingFields: [
      ...(!matchedSkill ? ['Primary skill'] : []),
      ...(!components.length ? ['Components'] : []),
      ...(!objectiveCount ? ['Objectives'] : [])
    ]
  };
}

async function getSupadataTranscript(url) {
  const key = process.env.SUPADATA_API_KEY;
  if (!key) return { text:null, source:'Supadata key missing', segments:[], status:'unavailable' };

  const headers = { 'x-api-key':key };
  const response = await fetch(`https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(url)}&mode=auto`, { headers });

  if (!response.ok && response.status !== 202) {
    return { text:null, source:`Supadata transcript error ${response.status}`, segments:[], status:'failed' };
  }

  let data = await response.json();

  if (response.status === 202 || data?.jobId) {
    const jobId = data.jobId;
    for (let attempt = 0; attempt < 24; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const poll = await fetch(`https://api.supadata.ai/v1/transcript/${encodeURIComponent(jobId)}`, { headers });
      if (!poll.ok) continue;
      data = await poll.json();
      if (data.status === 'failed') {
        return { text:null, source:'Supadata transcript job failed', segments:[], status:'failed' };
      }
      if (data.status === 'completed') break;
    }
  }

  const content = data?.content;
  const segments = Array.isArray(content) ? content.map(item => ({
    text:item.text || '',
    offset:Number(item.offset || 0),
    duration:Number(item.duration || 0),
    lang:item.lang || data?.lang || ''
  })).filter(item => item.text) : [];

  const text = Array.isArray(content)
    ? segments.map(item => {
        const seconds = Math.round(item.offset / 1000);
        const mm = Math.floor(seconds / 60);
        const ss = String(seconds % 60).padStart(2,'0');
        return `[${mm}:${ss}] ${item.text}`;
      }).join('\n')
    : (typeof content === 'string' ? content : data?.transcript || null);

  return {
    text,
    segments,
    source:text ? 'Supadata social transcript' : 'Supadata returned no transcript',
    status:text ? 'completed' : 'empty',
    language:data?.lang || null
  };
}

async function getSupadataMetadata(url) {
  const key = process.env.SUPADATA_API_KEY;
  if (!key) return null;
  try {
    const response = await fetch(`https://api.supadata.ai/v1/metadata?url=${encodeURIComponent(url)}`, {
      headers:{ 'x-api-key':key }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function extractSocialVideo(url) {
  const key = process.env.SUPADATA_API_KEY;
  if (!key) return { status:'unavailable', error:'SUPADATA_API_KEY is not configured.' };

  const schema = {
    type:'object',
    properties:{
      videoPurpose:{
        type:'string',
        description:'The central coaching purpose of the video. Name the actual sport skill or concept being taught.'
      },
      primarySkillCandidate:{
        type:'string',
        description:'The most likely primary lacrosse skill being intentionally taught, e.g. Shooting, Passing, Dodging, Ground Balls, Defense.'
      },
      primarySkillEvidence:{
        type:'array',
        items:{ type:'string' },
        description:'Concrete visual, spoken, or on-screen-text evidence supporting the primary skill.'
      },
      onScreenText:{
        type:'array',
        items:{
          type:'object',
          properties:{
            text:{type:'string'},
            approximateTime:{type:'string'},
            meaning:{type:'string'}
          },
          required:['text']
        },
        description:'Read all meaningful instructional text overlays/captions visible inside the video. Preserve wording as closely as possible.'
      },
      demonstratedActions:{
        type:'array',
        items:{
          type:'object',
          properties:{
            action:{type:'string'},
            approximateTime:{type:'string'},
            coachingMeaning:{type:'string'}
          },
          required:['action']
        },
        description:'Distinct lacrosse actions demonstrated in sequence.'
      },
      drillVariations:{
        type:'array',
        items:{
          type:'object',
          properties:{
            name:{type:'string'},
            evidence:{type:'string'},
            approximateTime:{type:'string'}
          },
          required:['name']
        },
        description:'Named or clearly differentiated drill/skill variations demonstrated in the video.'
      },
      startingSetup:{
        type:'object',
        properties:{
          players:{type:'string'},
          goal:{type:'string'},
          cones:{type:'string'},
          balls:{type:'string'},
          startingPositions:{type:'array',items:{type:'string'}},
          space:{type:'string'}
        }
      },
      sequenceSummary:{
        type:'array',
        items:{type:'string'},
        description:'Short chronological summary of what the athlete(s) actually do.'
      },
      uncertainty:{
        type:'array',
        items:{type:'string'},
        description:'Anything not visible or supported strongly enough to infer.'
      }
    },
    required:['videoPurpose','primarySkillCandidate','primarySkillEvidence','onScreenText','demonstratedActions','sequenceSummary','uncertainty']
  };

  const prompt = [
    'Analyze this lacrosse coaching video as evidence, not as generic inspiration.',
    'Watch the full video, including visual actions, spoken audio, and text overlays inside the frames.',
    'The PRIMARY SKILL must reflect what is intentionally taught most often and most explicitly.',
    'Read instructional on-screen text carefully because it may name shot types, drill variations, constraints, or coaching cues.',
    'Do not call something Passing merely because a ball changes hands before the main action.',
    'Do not invent backyard setup, targets, cones, distances, repetitions, or mechanics unless they are visibly shown or stated.',
    'Separate what is actually demonstrated from what you infer.',
    'If multiple shooting variations appear, list each variation separately.',
    'Use approximate timestamps whenever possible.'
  ].join(' ');

  const start = await fetch('https://api.supadata.ai/v1/extract', {
    method:'POST',
    headers:{ 'x-api-key':key, 'Content-Type':'application/json' },
    body:JSON.stringify({ url, prompt, schema })
  });

  if (!start.ok) {
    return { status:'failed', error:`Supadata video extraction error ${start.status}` };
  }

  const job = await start.json();
  const jobId = job?.jobId;
  if (!jobId) return { status:'failed', error:'Supadata video extraction did not return a job ID.' };

  for (let attempt = 0; attempt < 36; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const poll = await fetch(`https://api.supadata.ai/v1/extract/${encodeURIComponent(jobId)}`, {
      headers:{ 'x-api-key':key }
    });
    if (!poll.ok) continue;
    const result = await poll.json();

    if (result.status === 'completed') {
      return { status:'completed', data:result.data || {}, jobId };
    }
    if (result.status === 'failed') {
      return { status:'failed', error:result.error?.message || result.error?.details || 'Video extraction failed.', jobId };
    }
  }

  return { status:'timeout', error:'Video analysis is still processing. Try the source again in a moment.', jobId };
}

function platformFromUrl(url='') {
  if (/tiktok\.com/i.test(url)) return 'TikTok';
  if (/instagram\.com/i.test(url)) return 'Instagram';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'YouTube';
  return 'Web';
}

function decodeHtml(value='') {
  return value
    .replace(/&amp;/g,'&')
    .replace(/&quot;/g,'"')
    .replace(/&#39;/g,"'")
    .replace(/&lt;/g,'<')
    .replace(/&gt;/g,'>');
}

function metaValue(html, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']*)["']`,'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${escaped}["']`,'i'),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']*)["']`,'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escaped}["']`,'i')
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]);
  }
  return '';
}

async function getOpenGraphMeta(url, platform='Web') {
  try {
    const response = await fetch(url, {
      redirect:'follow',
      headers:{
        'User-Agent':'Mozilla/5.0 (compatible; CoachVault/1.0; +https://coachvault.app)',
        'Accept':'text/html,application/xhtml+xml'
      }
    });
    if (!response.ok) return { platform, title:url, url, accessStatus:`HTTP ${response.status}` };
    const html = await response.text();
    const title = metaValue(html,'og:title') || metaValue(html,'twitter:title') || url;
    const description = metaValue(html,'og:description') || metaValue(html,'description') || '';
    const thumbnail = metaValue(html,'og:image') || metaValue(html,'twitter:image') || '';
    return { platform, title, description, thumbnail, url, accessStatus:'Public metadata available' };
  } catch (error) {
    return { platform, title:url, url, accessStatus:'Public metadata unavailable', accessError:error.message };
  }
}

async function getTikTokMeta(url) {
  try {
    const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
      headers:{ 'Accept':'application/json' }
    });
    if (!response.ok) {
      const fallback = await getOpenGraphMeta(url,'TikTok');
      return { ...fallback, sourceMethod:'TikTok public page metadata' };
    }
    const data = await response.json();
    return {
      platform:'TikTok',
      title:data.title || 'TikTok video',
      description:data.title || '',
      author:data.author_name || '',
      authorUrl:data.author_url || '',
      thumbnail:data.thumbnail_url || '',
      embedHtml:data.html || '',
      provider:data.provider_name || 'TikTok',
      url,
      accessStatus:'Recognized via TikTok oEmbed',
      sourceMethod:'TikTok oEmbed'
    };
  } catch (error) {
    const fallback = await getOpenGraphMeta(url,'TikTok');
    return { ...fallback, sourceMethod:'TikTok public page metadata', accessError:error.message };
  }
}

async function getSourceMeta(url) {
  const platform = platformFromUrl(url);

  if (platform === 'TikTok') return getTikTokMeta(url);

  if (platform === 'Instagram') {
    const meta = await getOpenGraphMeta(url,'Instagram');
    return { ...meta, sourceMethod:'Instagram public page metadata' };
  }

  if (platform === 'YouTube') {
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      if (!response.ok) return getOpenGraphMeta(url,'YouTube');
      const data = await response.json();
      return { platform:'YouTube', title:data.title, author:data.author_name, thumbnail:data.thumbnail_url, url, accessStatus:'Recognized via YouTube oEmbed', sourceMethod:'YouTube oEmbed' };
    } catch {
      return getOpenGraphMeta(url,'YouTube');
    }
  }

  return getOpenGraphMeta(url,'Web');
}

export async function POST(request) {
  const contentType = request.headers.get('content-type') || '';
  let uploadedFile = null;
  let uploadedFileMeta = null;
  let blobFileUrl = null;
  let body = {};

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    uploadedFile = form.get('file');
    body.mode = form.get('mode') || 'file';

    if (uploadedFile && typeof uploadedFile === 'object') {
      uploadedFileMeta = {
        name: uploadedFile.name || 'uploaded-file',
        type: uploadedFile.type || 'application/octet-stream',
        size: uploadedFile.size || 0
      };
      const bytes = Buffer.from(await uploadedFile.arrayBuffer());
      const filename = uploadedFileMeta.name.toLowerCase();

      if (uploadedFileMeta.type.startsWith('text/') || filename.endsWith('.txt')) {
        body.text = bytes.toString('utf8');
      } else {
        body.uploadedBinary = bytes.toString('base64');
      }
    }
  } else {
    body = await request.json();

    if (body.mode === 'blob-file' && body.blobUrl && body.fileMeta) {
      blobFileUrl = body.blobUrl;
      uploadedFileMeta = {
        name: body.fileMeta.name || 'uploaded-file',
        type: body.fileMeta.type || 'application/octet-stream',
        size: Number(body.fileMeta.size || 0)
      };

      if (uploadedFileMeta.size > 10 * 1024 * 1024) {
        return NextResponse.json({
          error:`${uploadedFileMeta.name} is ${(uploadedFileMeta.size/(1024*1024)).toFixed(1)} MB. CoachVault 3.5.1 currently supports documents up to 10 MB.`
        }, { status:413 });
      }

      const blobResponse = await fetch(blobFileUrl);
      if (!blobResponse.ok) {
        return NextResponse.json({
          error:`CoachVault uploaded ${uploadedFileMeta.name}, but could not retrieve it for analysis (${blobResponse.status}).`
        }, { status:502 });
      }

      const bytes = Buffer.from(await blobResponse.arrayBuffer());
      const filename = uploadedFileMeta.name.toLowerCase();

      if (uploadedFileMeta.type.startsWith('text/') || filename.endsWith('.txt')) {
        body.text = bytes.toString('utf8');
      } else {
        body.uploadedBinary = bytes.toString('base64');
      }
    }
  }

  try {
    const standards = loadCVIL();
    const { mode, url, text, transcript } = body;
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error:'OPENAI_API_KEY is not configured.' }, { status:500 });
    }

    let sourceText = text || transcript || '';
    let sourceMeta = uploadedFileMeta ? {
      platform: mode === 'blob-file' ? 'Large File Upload' : 'File Upload',
      title: uploadedFileMeta.name,
      mimeType: uploadedFileMeta.type,
      size: uploadedFileMeta.size
    } : null;
    let transcriptSource = text ? 'Pasted text' : transcript ? 'Pasted fallback transcript' : uploadedFileMeta ? 'Uploaded file' : 'Unknown';
    const hasBinaryFile = ['file','blob-file'].includes(mode) && uploadedFileMeta && body.uploadedBinary;
    const isPdfFile = hasBinaryFile && (
      uploadedFileMeta.type === 'application/pdf' ||
      uploadedFileMeta.name.toLowerCase().endsWith('.pdf')
    );

    let socialVideoEvidence = null;
    let socialTranscript = null;

    if (mode === 'link') {
      sourceMeta = await getSourceMeta(url);
      const platform = sourceMeta?.platform || platformFromUrl(url);
      const isSocialVideo = ['TikTok','Instagram'].includes(platform);

      if (isSocialVideo) {
        const [metadataResult, transcriptResult, videoResult] = await Promise.all([
          getSupadataMetadata(url),
          getSupadataTranscript(url),
          extractSocialVideo(url)
        ]);

        socialTranscript = transcriptResult;
        socialVideoEvidence = videoResult;

        if (metadataResult) {
          sourceMeta = {
            ...sourceMeta,
            platform: metadataResult.platform ? String(metadataResult.platform).replace(/^./, c=>c.toUpperCase()) : platform,
            title: metadataResult.title || sourceMeta?.title || metadataResult.description || url,
            description: metadataResult.description || sourceMeta?.description || '',
            author: metadataResult.author?.displayName || metadataResult.author?.username || sourceMeta?.author || '',
            thumbnail: metadataResult.media?.thumbnailUrl || sourceMeta?.thumbnail || '',
            duration: metadataResult.media?.duration || null,
            tags: metadataResult.tags || [],
            canonicalUrl: metadataResult.url || url,
            accessStatus: videoResult?.status === 'completed' ? 'Full social video analyzed' : 'Social source recognized',
            sourceMethod:'Supadata video intelligence + transcript + metadata'
          };
        }

        const evidenceText = videoResult?.status === 'completed'
          ? JSON.stringify(videoResult.data, null, 2)
          : '';

        const transcriptText = transcriptResult?.text || '';

        sourceText = [
          `SOCIAL PLATFORM: ${platform}`,
          sourceMeta?.author ? `CREATOR: ${sourceMeta.author}` : '',
          sourceMeta?.title ? `POST TITLE/CAPTION: ${sourceMeta.title}` : '',
          sourceMeta?.description && sourceMeta.description !== sourceMeta.title ? `POST DESCRIPTION: ${sourceMeta.description}` : '',
          sourceMeta?.duration ? `VIDEO DURATION: ${sourceMeta.duration} seconds` : '',
          transcriptText ? `\nTIMESTAMPED SPOKEN/CAPTION TRANSCRIPT:\n${transcriptText}` : '',
          evidenceText ? `\nFULL VIDEO VISUAL/AUDIO EXTRACTION:\n${evidenceText}` : '',
          `\nSOURCE URL: ${url}`
        ].filter(Boolean).join('\n');

        transcriptSource = [
          videoResult?.status === 'completed' ? 'Full social video visual/audio extraction' : 'Social video extraction unavailable',
          transcriptResult?.text ? 'timestamped transcript' : 'no transcript',
          'metadata'
        ].join(' + ');

        if (videoResult?.status !== 'completed' && !transcriptResult?.text) {
          return NextResponse.json({
            error:`CoachVault recognized this ${platform} video, but full video evidence could not be retrieved. ${videoResult?.error || ''}`.trim(),
            sourceMeta
          }, { status:400 });
        }
      } else {
        if (!sourceText && /youtube\.com|youtu\.be/.test(url || '')) {
          const transcriptResult = await getSupadataTranscript(url);
          sourceText = transcriptResult.text || '';
          transcriptSource = transcriptResult.source;
        }

        if (!sourceText) {
          const parts = [
            `Platform: ${sourceMeta?.platform || 'Web'}`,
            sourceMeta?.author ? `Creator: ${sourceMeta.author}` : '',
            sourceMeta?.title ? `Caption/Title: ${sourceMeta.title}` : '',
            sourceMeta?.description && sourceMeta.description !== sourceMeta.title ? `Description: ${sourceMeta.description}` : '',
            `Source URL: ${url}`
          ].filter(Boolean);
          sourceText = parts.join('\n');
          transcriptSource = sourceMeta?.sourceMethod || 'Public source metadata';
        }
      }
    }

    if (!sourceText.trim() && !hasBinaryFile) {
      return NextResponse.json({ error:'No source text was available for analysis.' }, { status:400 });
    }

    if (hasBinaryFile && !isPdfFile && !sourceText.trim()) {
      return NextResponse.json({
        error:`${uploadedFileMeta.name} uploaded successfully, but visual extraction for this file type is not enabled yet. For diagram-heavy documents, export the file as PDF and upload the PDF.`
      }, { status:400 });
    }

    const library = standards.map(compactStandard);

    const prompt = `You are CoachVault Engine 3.5.1 powered by CVIL.

Your job is to convert coaching content into standardized coaching knowledge.

You MUST match the source to the provided CoachVault Intelligence Library.
Do not invent new primary skills, components, or objectives.
Choose only exact names from CVIL.

Scoring is independent:
90-100 core teaching purpose
70-89 major purpose
45-69 meaningful support
0-44 incidental

Return one primary skill.
Return only components that the source intentionally teaches.
For each component, return only objectives that the source intentionally teaches.
Every score needs a short evidence-based reason.
Do not divide scores to total 100.
Create two linked outputs: standardized Coach Intelligence and a field-ready Coach Practice Card.
For Coach Practice Card setup details, use the source first. You may infer a detail only when it is strongly supported by the activity. Mark each setup field as Detected, Estimated, or Not stated.
Never invent exact player counts, dimensions, timing, rotations, or equipment without support.
The Coach Practice Card must let a coach run the drill without rewatching the source. Use short, ordered, field-ready instructions.

CVIL:
${JSON.stringify(library)}

Return strict JSON:
{
  "engineVersion":"3.5.1-cpc",
  "title":"",
  "resourceType":"Drill",
  "summary":"",
  "teachingMethod":"Individual Technique|Partner Activity|Station|Competitive Drill|Small-Sided Competition|Small-Sided Game|Team Activity|Progression|Film / Demonstration|Other",
  "primarySkill":{"name":"","weight":0,"reason":""},
  "components":[
    {
      "name":"",
      "weight":0,
      "reason":"",
      "objectives":[{"name":"","weight":0,"reason":""}]
    }
  ],
  "supportingSkills":[{"name":"","weight":0,"reason":""}],
  "context":[{"name":"","weight":0,"reason":""}],
  "incidentalActions":[{"name":"","weight":0,"reason":""}],
  "learningObjectives":[""],
  "setup":{"players":"","duration":null,"equipment":[],"space":"","age":[]},
  "coachingCues":[""],
  "commonMistakes":[""],
  "constraints":[""],
  "progressions":[""],
  "regressions":[""],
  "evidence":[{"text":"","location":"timestamp, paragraph, or source section"}],
  "confidence":{"overall":0,"primarySkill":0,"components":0,"objectives":0,"setup":0,"notes":""},
  "knowledgeModel":{
    "domain":"Skills|Offense|Defense|Transition|Goalie|Faceoffs|Athletic Development|Team Culture",
    "trainingObjectives":[""],
    "problemsSolved":[""],
    "constraints":[""],
    "prerequisites":[""],
    "avoidIf":[""]
  },
  "coachPracticeCard":{
    "purpose":"one field-ready sentence",
    "whenToUse":["observable player problem"],
    "setup":{
      "players":{"value":"","source":"Detected|Estimated|Not stated"},
      "groups":{"value":"","source":"Detected|Estimated|Not stated"},
      "equipment":{"value":[""],"source":"Detected|Estimated|Not stated"},
      "space":{"value":"","source":"Detected|Estimated|Not stated"},
      "time":{"value":"","source":"Detected|Estimated|Not stated"},
      "rotation":{"value":"","source":"Detected|Estimated|Not stated"}
    },
    "fieldLayout":{
      "canvas":"crease-area|half-field|full-field|small-grid|no-goal",
      "participationMode":"station|live-play",
      "drillType":"skill-development|progression|transition|small-sided-game|shooting|ground-ball|clearing|riding|other",
      "progressionBehavior":"none|reset|accumulate|replace|rotate",
      "fieldTemplate":"full-field|half-field|offensive-end|defensive-end|crease-area|behind-goal|small-grid|no-goal|custom",
      "confidence":"Detected|Estimated|Not stated",
      "players":[
        {"id":"O1","role":"offense|defense|goalie","stationType":"player|line","participantState":"waiting|entering|active|exiting","lineRole":"waiting|entry|rotation|feeding|offensive-entry|defensive-entry|station","stagingZone":"high|low|left|right|sideline|end-line|midfield|outside-boundary|none","queueDirection":"up|down|left|right|up-left|up-right|down-left|down-right|none","entryPoint":"top-center|top-left|top-right|left-sideline|right-sideline|end-line|midfield|x|custom|none","x":50,"y":50}
      ],
      "coach":{"x":50,"y":90},
      "balls":[{"x":50,"y":50}],
      "cones":[{"function":"boundary|landmark|gate|starting-point|entry-marker|target|turning-point|unknown","x":50,"y":50}],
      "notes":""
    },
    "runTheDrill":["numbered step written as a direct coaching instruction"],
    "coachFocus":["maximum four teaching points"],
    "watchFor":["immediate correction"],
    "makeEasier":["safe regression"],
    "makeHarder":["useful progression or constraint"],
    "prerequisites":["skill or concept players should already understand"],
    "avoidIf":["condition where this drill is a poor fit"],
    "successCriteria":["observable evidence the drill is working"],
    "notes":""
  }
}


FIELD SETUP RULES:
Generate a structured top-down SETUP diagram for the Coach Practice Card.

The Field Setup answers only:
WHERE DOES EACH PERSON AND PIECE OF EQUIPMENT START BEFORE THE REP BEGINS?

Do not use Field Setup to explain how the drill runs. Passes, cuts, dodges, shots, rotations, and movement belong in Run the Drill.

COACHVAULT DIAGRAM STANDARD — ENGINE 3.3

PARTICIPATION MODE
participationMode exists only to drive diagram behavior.
station = fixed stations or queues.
live-play = players participate simultaneously in a live numerical situation.
Do not use progression, transition, skill-development, or small-sided-game as participationMode. Those belong in drillType.

DRILL TYPE
Use drillType for coaching structure:
skill-development, progression, transition, small-sided-game, shooting, ground-ball, clearing, riding, other.

BASE SETUP FRAME
For multi-frame PDFs, screenshots, or diagram sequences:
- derive Field Setup from the earliest complete stable configuration
- use later frames to understand execution and progression
- do not overwrite base setup with a later movement frame

STATION DRILLS
- waiting players stay outside the central active area
- first player is nearest the station marker or entry point
- waiting players extend away from the active area
- preserve open central movement space
- when a cone is the station launch point, visual order is:
  active area -> cone -> first player -> waiting players

RADIAL STATIONS
- determine a shared drill center
- queue direction follows the vector from drill center through station and continues outward
- use diagonal queue directions when needed

LIVE PLAY
- show active players inside the playable area
- waiting players remain outside the live play
- waiting groups may exist when feeding future reps
- do not turn every roster player into an on-field participant

PARTICIPANT STATE
Use participantState:
waiting, entering, active, exiting.

LINE ROLE
Use lineRole:
waiting, entry, rotation, feeding, offensive-entry, defensive-entry, station.

STAGING ZONE
Use stagingZone:
high, low, left, right, sideline, end-line, midfield, outside-boundary, none.

ENTRY POINTS
Entry points and active positions are separate concepts.
entryPoint is where a player enters.
The player's live position may be elsewhere.
Never treat entry coordinate as permanent field position.

PROGRESSIVE LIVE DRILLS
Use progressionBehavior:
none = no staged progression
reset = each stage is a new rep
accumulate = earlier active players remain as new players enter
replace = new participants replace prior participants
rotate = participants move through roles/stations

For numerical build-up drills such as 2v1 -> 3v2 -> 4v3:
- preserve earlier active players when progressionBehavior=accumulate
- do not interpret each numerical state as a totally new setup
- consolidated offense/defense entry queues may supply multiple roster positions

QUEUE BY DRILL ROLE
Organize queues by drill function, not roster position.
Attackers and midfielders may share one offensive-entry queue.
Defenders, LSMs, and midfielders may share one defensive-entry queue.

QUEUE GEOMETRY
- top/endline queue extends outward/up
- bottom boundary queue extends outward/down
- left sideline queue extends outward/left
- right sideline queue extends outward/right
- radial diagonal stations may use up-left, up-right, down-left, down-right
- a line behind a restraining line stays on the inactive side
- never stack waiting players toward goal or deeper into active space

CONE FUNCTION
Classify cones:
boundary, landmark, gate, starting-point, entry-marker, target, turning-point, unknown.
Do not assume a cone cluster forms a boundary.

FUNCTIONAL FIELD ELEMENTS
Do not assume every visible source-template element is required.
Treat field elements as conceptually:
required, contextual, decorative-template, uncertain.
Do not force a goal/crease simply because a source background displayed one.

FIELD TEMPLATES
full-field
half-field
offensive-end
defensive-end
crease-area
behind-goal
small-grid
no-goal
custom

LACROSSE SYMBOL STANDARD
Crease = circle.
Goal = triangle inside the crease.
Never draw a lacrosse goal as a rectangle.
Offense = O1, O2...
Defense = D1, D2...
Goalie = G.
Coach = C.
Ball = small dot.
Cone = triangle marker.

COACH RELATIONSHIPS
When supported, identify coach function:
initiator, feeder, observer, entry-controller.
Preserve relationship between coach and entry point/station.

SOURCE-SPECIFIC LABELS
Preserve unfamiliar labels as annotations.
Do not promote them to universal CoachVault vocabulary without repeated evidence.

SETUP CONFIDENCE
Detected = explicitly shown/stated.
Estimated = spacing or exact position reconstructed.

The setup diagram should be understandable in three seconds.

PRACTICE CARD INTERPRETATION RULES:
- Preserve consolidated entry queues from the source. Do not flatten an entry queue into several active-player dots.
- For build-up drills, return the initial live state separately from staging groups.
- A source that builds to 6v6 does NOT imply exactly 12+ required players. Player count should be roster-dependent unless the source states a minimum.
- For a single-goal drill, equipment should say one goal, not plural goals.
- Do not number Run the Drill strings; the UI supplies numbering.
- If the source shows one offensive entry queue and one defensive entry queue, return exactly those queues unless other distinct queues are source-supported.
- In a live progression, active players, waiting players, and entering players are different participant states.

SOCIAL VIDEO INTELLIGENCE RULES:
For TikTok and Instagram videos, FULL VIDEO VISUAL/AUDIO EXTRACTION is higher-quality evidence than metadata or a thumbnail.
Use evidence priority in this order:
1. Explicit on-screen instructional text inside video frames.
2. Repeated demonstrated actions across the video.
3. Spoken/caption transcript.
4. Creator caption/title/description.
5. Thumbnail only as a weak supporting frame.

PRIMARY SKILL EVIDENCE GATE:
- A primary skill score of 85+ requires at least two concrete evidence items from the full video, on-screen text, or transcript.
- Do not score Passing highly merely because the ball is passed before a shot.
- If repeated actions are shots on goal and overlays describe shooting types, Shooting must dominate unless stronger contrary evidence exists.
- Supporting/incidental actions must not displace the central teaching purpose.
- If evidence is insufficient, lower confidence rather than inventing certainty.

ON-SCREEN TEXT:
- Treat instructional text overlays as first-class coaching evidence.
- Preserve named techniques/variations from overlays.
- Use the overlay wording in drill variations, coaching cues, or evidence when supported.
- Do not silently replace specific overlay language with generic phrases.

NO GENERIC FILLER:
- Never invent a backyard, target, cone, marked spot, distance, rep count, or retrieval pattern unless seen/stated.
- Never produce generic instructions merely because the source is visually incomplete.
- When unsupported, use Not stated / Needs review.

SOCIAL SOURCE RULES:
When mode=link and the source is TikTok or Instagram:
- Treat the platform as a recognized source, not a generic webpage.
- Use public caption/title, creator information, thumbnail, and other available metadata as source evidence.
- A social thumbnail is only one visual frame; do not pretend it proves movement, progression, or the full drill sequence.
- Never infer a complete drill solely from a vague caption or thumbnail.
- If visual evidence is incomplete, lower setup confidence and state exactly what is unsupported.
- Preserve the original social URL as source attribution.
- The goal is progressive enhancement: analyze everything publicly available now, while keeping unsupported details marked for review.

FILE SOURCE RULES:
When mode=file or mode=blob-file:
- Treat upload as a first-class coaching source.
- Preserve filename, MIME type, and source type in diagnostics.
- A file may contain one drill, multiple drills, a progression, clinic packet, or practice plan.
- Do not assume 1 upload = 1 drill.
- For multi-drill documents, identify distinct drill candidates before creating Vault items.
- For PDFs/images with sequential diagrams, apply the Base Setup Frame rule.
- Text uploads can be analyzed immediately.
- PDF uploads are analyzed directly as multimodal file inputs: inspect both extracted text and page images.
- For diagram-heavy PDFs, visual page content is evidence and must be used when determining setup.
- Do not assume a later progression frame is the initial setup.
- Non-PDF binary visual extraction is not enabled in this build; return a clear diagnostic rather than fabricating content.

SOURCE:
${sourceText ? sourceText.slice(0, 50000) : `[Uploaded PDF: ${uploadedFileMeta?.name || 'document.pdf'} — analyze the file contents and page images directly.]`}`;

    const hasSocialThumbnail = mode === 'link' && ['TikTok','Instagram'].includes(sourceMeta?.platform) && /^https?:\/\//.test(sourceMeta?.thumbnail || '');
    const model = (isPdfFile || hasSocialThumbnail) ? 'gpt-4.1' : 'gpt-4.1-mini';

    const userContent = isPdfFile
      ? [
          {
            type: 'file',
            file: {
              filename: uploadedFileMeta.name,
              file_data: `data:application/pdf;base64,${body.uploadedBinary}`
            }
          },
          {
            type: 'text',
            text: prompt
          }
        ]
      : hasSocialThumbnail
        ? [
            { type:'text', text:prompt },
            { type:'image_url', image_url:{ url:sourceMeta.thumbnail, detail:'high' } }
          ]
        : prompt;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST',
      headers:{
        'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        model,
        temperature:0.05,
        response_format:{ type:'json_object' },
        messages:[
          { role:'system', content:'Return valid JSON only. Match exact CVIL vocabulary. Produce a concise, field-ready Coach Practice Card. Mark inferred setup fields as Estimated. For PDFs, inspect both document text and page diagrams. For social video sources, prioritize explicit on-screen text, full-video visual evidence, and repeated demonstrated actions over metadata. Never invent generic setup instructions when the evidence does not support them. Field Setup must come from the earliest complete stable setup frame; later frames describe progression unless the source indicates otherwise.' },
          { role:'user', content:userContent }
        ]
      })
    });

    const raw = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error:raw?.error?.message || 'OpenAI analysis failed.' }, { status:response.status });
    }

    let analysis = JSON.parse(raw.choices?.[0]?.message?.content);
    analysis = reconcileAgainstCVIL(analysis, standards);

    const diagnosticSourceText = sourceText || (isPdfFile ? `[PDF analyzed directly: ${uploadedFileMeta.name}]` : '');
    const diagnostics = buildDiagnostics({
      analysis,
      sourceText: diagnosticSourceText,
      model,
      transcriptSource: isPdfFile ? 'Uploaded PDF — text + page images' : hasSocialThumbnail ? `${transcriptSource} + public thumbnail` : transcriptSource,
      standards
    });
    if (uploadedFileMeta) {
      diagnostics.uploadedFile = uploadedFileMeta;
      diagnostics.fileAnalysisMode = isPdfFile
        ? (mode === 'blob-file' ? 'Large PDF via direct Blob upload + multimodal file input' : 'PDF multimodal file input')
        : (mode === 'blob-file' ? 'Large file via direct Blob upload' : 'Text extraction');
      diagnostics.fileTransport = mode === 'blob-file' ? 'Vercel Blob client upload' : 'Direct request upload';
    }
    if (mode === 'link' && sourceMeta) {
      diagnostics.recognizedSource = {
        platform: sourceMeta.platform,
        method: sourceMeta.sourceMethod || 'Public metadata',
        accessStatus: sourceMeta.accessStatus || 'Unknown',
        thumbnailAnalyzed: Boolean(hasSocialThumbnail),
        fullVideoAnalyzed: Boolean(socialVideoEvidence?.status === 'completed'),
        transcriptAvailable: Boolean(socialTranscript?.text),
        videoExtractionJobId: socialVideoEvidence?.jobId || null
      };
      if (socialVideoEvidence?.status === 'completed') {
        diagnostics.socialVideoEvidence = socialVideoEvidence.data;
      }
    }

    return NextResponse.json({ analysis, sourceMeta, diagnostics });
  } catch (error) {
    return NextResponse.json({ error:error.message || 'Unexpected Engine error.' }, { status:500 });
  }
}
