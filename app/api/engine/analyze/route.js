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
  "engineVersion":"3.2.7-cpc",
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
      "confidence":"Detected|Estimated|Not stated",
      "players":[
        {"id":"O1","role":"offense|defense|goalie","stationType":"player|line","queueDirection":"up|down|left|right|none","x":50,"y":50}
      ],
      "coach":{"x":50,"y":90},
      "balls":[{"x":50,"y":50}],
      "cones":[{"x":50,"y":50}],
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

Do not diagram how the drill runs.
Do not show passes, cuts, dodges, player movement, post-rep rotation, or outcomes.

FIRST classify participationMode:

station
Use when players rotate through fixed lines or starting stations.

For station drills:
- Determine the nearest field boundary for each stationary line.
- Place the first player at the starting point nearest that boundary.
- Place every waiting player on the OUTSIDE side of that boundary.
- Never infer queue direction from page orientation alone.
- Example: a line whose active player is near the bottom end line must stack downward, behind the end line.
- Example: a line whose active player is near the top end line must stack upward, behind the end line.
- Example: a line near the left sideline stacks left.
- Example: a line near the right sideline stacks right.
- Waiting players must be staged OUTSIDE the playable field area.
- The first player in line is closest to the field.
- The queue extends AWAY from the field.
- Sideline queues extend outside the sideline.
- Endline queues extend behind the endline.
- Waiting players never stack deeper into the active drill area.
- Use stationType "line".
- queueDirection tells the renderer which way the waiting line extends: up, down, left, or right.

live-play
Use when the rep is a live numerical situation such as 1v1, 2v2, 3v3, 4v4, 5v5, or 6v6.

For live-play drills:
- Show ONLY the players who actively begin the rep on the field.
- Do not draw waiting player lines beside the drill.
- Assume waiting players are on the sideline or at midfield unless their exact location matters to understanding setup.
- Use stationType "player" for active players.

Populate only starting information:
- canvas
- participationMode
- offensive starting positions or stationary lines
- defensive starting positions or stationary lines
- goalie
- coach
- starting balls
- cones or markers
- setup notes

LACROSSE FIELD TEMPLATE RULES:
The AI selects the field template. It does not invent field markings.

crease-area:
- one end line
- one circular crease
- one triangle goal inside the crease
- no midfield circle

half-field:
- one end line
- sidelines
- one circular crease
- one triangle goal inside the crease
- one restraining line across the field between the goal area and midfield side
- this line is a restraining line, NOT midfield
- no midfield circle
- no second goal

full-field:
- two end lines
- sidelines
- two circular creases
- two triangle goals
- midfield line
- midfield faceoff markings
- restraining lines

small-grid:
- simple rectangular drill area
- no field markings unless needed

no-goal:
- simple rectangular playable area
- no goal or crease

LACROSSE SYMBOL STANDARD:
- Crease = circle.
- Goal = triangle inside the crease.
- Never draw the goal as a rectangle.
- Offense = O1, O2, O3...
- Defense = D1, D2, D3...
- Goalie = G.
- Coach = C.
- Ball = small dot.
- Cone = triangle marker.

QUEUE GEOMETRY VALIDATION:
Before returning fieldLayout, verify every station line:
- The first/darkest player is closest to the active drill area.
- Waiting players extend in the opposite direction from entry into the drill.
- A line at the top/endline stacks upward outside the boundary.
- A line at the bottom/midfield boundary stacks downward outside the boundary.
- A line at the left sideline stacks left.
- A line at the right sideline stacks right.
- A line staged behind a restraining line may remain physically on the field, but its waiting players must stay on the inactive side of that restraining line.
- Never stack waiting players toward the goal or deeper into the active drill area.

For four-line or four-corner station drills:
- show all four starting lines
- place the first player nearest the field
- extend each waiting line outside the playable area

For randomized drills:
- show only the base pre-rep organization

Mark confidence Detected when setup is explicitly shown or stated.
Mark confidence Estimated when spacing must be reconstructed.

The setup diagram should be understandable in three seconds.

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
