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
  "engineVersion":"3.2.1-cpc",
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
      "confidence":"Detected|Estimated|Not stated",
      "players":[
        {"id":"O1","role":"offense|defense|goalie","x":50,"y":50}
      ],
      "coach":{"x":50,"y":90},
      "balls":[{"x":50,"y":50}],
      "cones":[{"x":50,"y":50}],
      "movements":[
        {"from":"O1","to":{"x":50,"y":40}}
      ],
      "passes":[
        {"from":"O1","to":"O2"}
      ],
      "rotation":[
        {"from":"O1","to":{"x":20,"y":85}}
      ],
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


FIELD LAYOUT RULES:
Generate a structured top-down field diagram for the Coach Practice Card.

IMPORTANT:
- Populate fieldLayout.players whenever the source describes or visibly demonstrates starting player locations.
- Populate fieldLayout.cones whenever cones are stated or clearly used.
- Populate fieldLayout.balls whenever the starting ball location is known.
- Populate fieldLayout.coach when a coach initiates or manages the drill.
- Populate movements, passes, and rotation when they are central to understanding how the drill runs.
- Do not return empty arrays when the source clearly gives enough information to reconstruct the setup.

Use normalized coordinates.
x = 0 left to 100 right.
For crease-area and half-field: y = 0 at the endline/goal side and y = 120 toward midfield.
For full-field: y = 0 to 160.
For small-grid and no-goal: y = 0 to 100.

Choose the smallest useful canvas:
- crease-area for drills concentrated around the cage
- half-field for most settled offense, defense, shooting, and small-sided drills
- full-field for clearing, riding, and full-field transition
- small-grid for keep-away, station work, footwork, and compact competition
- no-goal where a cage is irrelevant

Use O1, O2, O3... for offense.
Use D1, D2, D3... for defense.
Use G for goalie.
Use coach for the coach marker.

Mark confidence Detected when the source explicitly states or shows the setup.
Mark confidence Estimated when the setup is reasonably reconstructed but exact spacing is unclear.

For drills like four-corner or four-line drills, place all four starting groups on the diagram even if only one example rep is described.
For randomized drills, show the base starting positions and use only representative arrows needed to explain a typical rep.
Keep the diagram readable. Do not draw every possible variation at once.

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
