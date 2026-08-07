import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

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

async function getYouTubeTranscript(url) {
  const key = process.env.SUPADATA_API_KEY;
  if (!key) return { text:null, source:'Supadata key missing' };

  const response = await fetch(`https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(url)}`, {
    headers:{ 'x-api-key':key }
  });

  if (!response.ok) return { text:null, source:`Supadata error ${response.status}` };
  const data = await response.json();
  const text = Array.isArray(data.content)
    ? data.content.map(x => x.text || '').join(' ')
    : data.content || data.transcript || null;
  return { text, source:text?'Supadata transcript':'Supadata returned no transcript' };
}

async function getSourceMeta(url) {
  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!response.ok) return { platform:'Web', title:url, url };
    const data = await response.json();
    return { platform:'YouTube', title:data.title, author:data.author_name, thumbnail:data.thumbnail_url, url };
  } catch {
    return { platform:'Web', title:url, url };
  }
}

export async function POST(request) {
  const contentType = request.headers.get('content-type') || '';
  let uploadedFile = null;
  let uploadedFileMeta = null;
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
  }

  try {
    const standards = loadCVIL();
    const { mode, url, text, transcript } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error:'OPENAI_API_KEY is not configured.' }, { status:500 });
    }

    let sourceText = text || transcript || '';
    let sourceMeta = null;
    let transcriptSource = text ? 'Pasted text' : transcript ? 'Pasted fallback transcript' : 'Unknown';

    if (mode === 'link') {
      sourceMeta = await getSourceMeta(url);

      if (!sourceText && /youtube\.com|youtu\.be/.test(url || '')) {
        const transcriptResult = await getYouTubeTranscript(url);
        sourceText = transcriptResult.text || '';
        transcriptSource = transcriptResult.source;
      }

      if (!sourceText) {
        return NextResponse.json({ error:'CoachVault could not retrieve usable source text. Paste the transcript or source text and try again.' }, { status:400 });
      }
    }

    if (!sourceText.trim()) {
      return NextResponse.json({ error:'No source text was available for analysis.' }, { status:400 });
    }

    const library = standards.map(compactStandard);

    const prompt = `You are CoachVault Engine 3.0 powered by CVIL.

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
  "engineVersion":"3.3.0-cpc",
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

FILE SOURCE RULES:
When mode=file:
- Treat upload as a first-class coaching source.
- Preserve filename, MIME type, and source type in diagnostics.
- A file may contain one drill, multiple drills, a progression, clinic packet, or practice plan.
- Do not assume 1 upload = 1 drill.
- For multi-drill documents, identify distinct drill candidates before creating Vault items.
- For PDFs/images with sequential diagrams, apply the Base Setup Frame rule.
- Text uploads can be analyzed immediately.
- If binary visual extraction is not available for a format in this build, return a clear diagnostic rather than fabricating content.

SOURCE:
${sourceText.slice(0, 50000)}`;

    const model = 'gpt-4.1-mini';
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
          { role:'system', content:'Return valid JSON only. Match exact CVIL vocabulary. Produce a concise, field-ready Coach Practice Card. Mark inferred setup fields as Estimated.' },
          { role:'user', content:prompt }
        ]
      })
    });

    const raw = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error:raw?.error?.message || 'OpenAI analysis failed.' }, { status:response.status });
    }

    let analysis = JSON.parse(raw.choices?.[0]?.message?.content);
    analysis = reconcileAgainstCVIL(analysis, standards);

    const diagnostics = buildDiagnostics({
      analysis,
      sourceText,
      model,
      transcriptSource,
      standards
    });

    return NextResponse.json({ analysis, sourceMeta, diagnostics });
  } catch (error) {
    return NextResponse.json({ error:error.message || 'Unexpected Engine error.' }, { status:500 });
  }
}
