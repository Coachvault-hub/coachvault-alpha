import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const maxDuration = 30;

function loadCVIL() {
  const dir = path.join(process.cwd(), 'standards');
  const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
  return index.skills.map((entry) => JSON.parse(fs.readFileSync(path.join(dir, entry.file), 'utf8')));
}

function normalizeList(value) { return Array.isArray(value) ? value : []; }

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

function extractOutputText(response) {
  return (response?.output || [])
    .flatMap(item => item?.content || [])
    .filter(item => item?.type === 'output_text' && item?.text)
    .map(item => item.text)
    .join('\n')
    .trim();
}

function errorText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    for (const candidate of [value.message, value.details, value.error?.message, value.error?.details]) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }
    try { return JSON.stringify(value); } catch (_) {}
  }
  return String(value);
}

export async function POST(request) {
  try {
    const { responseId, fileMeta } = await request.json();

    if (!responseId) return NextResponse.json({ error:'Missing large-document response ID.' }, { status:400 });
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error:'OPENAI_API_KEY is not configured.' }, { status:500 });

    const response = await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(responseId)}`, {
      headers:{ 'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type':'application/json' },
      cache:'no-store'
    });

    const rawText = await response.text();
    let data;
    try { data = rawText ? JSON.parse(rawText) : {}; }
    catch (_) { return NextResponse.json({ error:rawText || `OpenAI returned an unexpected response (${response.status}).` }, { status:502 }); }

    if (!response.ok) return NextResponse.json({ error:errorText(data?.error || data) || `OpenAI response lookup failed (${response.status}).` }, { status:response.status });

    if (data.status === 'queued' || data.status === 'in_progress') {
      return NextResponse.json({
        status:'processing',
        message:data.status === 'queued' ? 'Large document is queued for analysis…' : 'Reading PDF text, diagrams, and drill sections…'
      }, { status:202 });
    }

    if (data.status !== 'completed') {
      const reason = data?.incomplete_details?.reason || data?.error?.message || data?.status || 'unknown';
      return NextResponse.json({ error:`Large-document analysis ended before completion: ${errorText(reason)}` }, { status:502 });
    }

    const analysisText = extractOutputText(data);
    if (!analysisText) return NextResponse.json({ error:'The large PDF finished processing, but OpenAI returned no structured analysis.' }, { status:502 });

    let analysis;
    try { analysis = JSON.parse(analysisText); }
    catch (error) { return NextResponse.json({ error:`The large PDF was analyzed, but the structured result was not valid JSON: ${error.message}` }, { status:502 }); }

    analysis = reconcileAgainstCVIL(analysis, loadCVIL());

    const sourceMeta = {
      platform:'Private File Upload',
      title:fileMeta?.name || 'Large PDF',
      mimeType:fileMeta?.type || 'application/pdf',
      size:Number(fileMeta?.size || 0),
      accessStatus:'Background PDF analysis completed'
    };

    const diagnostics = {
      engineVersion:analysis.engineVersion || '3.10.6-cpc',
      generatedAt:new Date().toISOString(),
      model:data.model || 'gpt-5.6',
      transcriptSource:'Private PDF — OpenAI Files API + background Responses API',
      uploadedFile:fileMeta || null,
      fileAnalysisMode:'Large PDF via authenticated private Blob read + OpenAI Files API + background mode',
      fileTransport:'Vercel Private Blob signed PUT + authenticated get() + OpenAI Files API',
      responseId,
      responseStatus:data.status
    };

    return NextResponse.json({ analysis, sourceMeta, diagnostics });
  } catch (error) {
    return NextResponse.json({
      error:error?.message || 'Unexpected large-document polling error.',
      stage:'openai-background-poll'
    }, { status:500 });
  }
}
