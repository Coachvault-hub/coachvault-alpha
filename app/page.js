'use client';

import { CVIL } from './cvil';
import { useEffect, useMemo, useState } from 'react';


const skillFolderMap = {
  'Ground Balls': 'Skills',
  'Cradling': 'Skills',
  'Catching': 'Skills',
  'Passing': 'Skills',
  'Ball Protection': 'Skills',
  'Athletic Movement': 'Player Development',
  'On-Ball Defense': 'Defense',
  'Off-Ball Defense': 'Defense',
  'Clearing': 'Transition',
  'Riding': 'Transition',
  'Shooting': 'Offense',
  'Dodging': 'Offense',
  'Feeding': 'Offense',
  'Finishing': 'Offense',
  'Goalie': 'Goalie',
  'Faceoffs': 'Faceoffs'
};

function suggestedFolderFor(item) {
  const skill = item?.primarySkill?.name || '';
  return item?.folder && item.folder !== 'Unfiled'
    ? item.folder
    : skillFolderMap[skill] || 'Skills';
}

const seedDrills = [
  {
    id: 1,
    title: 'Ground Ball Advantage Drill',
    resourceType: 'Drill',
    status: 'Approved',
    folder: 'Skills',
    sourceType: 'CoachVault Foundation',
    summary: 'Competitive small-sided ground-ball work that finishes with an outlet decision.',
    teachingMethod: 'Small-Sided Competition',
    primarySkill: { name: 'Ground Balls', weight: 96, reason: 'Winning and securing the loose ball is the central learning purpose.' },
    skillComponents: [
      { name: 'Scoop Through', weight: 94 },
      { name: 'Stick Protection', weight: 87 },
      { name: 'First Three Steps', weight: 76 },
      { name: 'Outlet Recognition', weight: 58 }
    ],
    supportingSkills: [{ name: 'Decision Making', weight: 67 }],
    incidentalActions: [{ name: 'Passing', weight: 24, reason: 'Passing completes the activity but is not the main teaching target.' }],
    learningObjectives: [
      'Gain possession without stopping the feet.',
      'Protect the stick immediately after the scoop.',
      'Recognize the safest outlet after possession.'
    ],
    setup: { players: '6-12', duration: 12, equipment: ['Balls', 'Cones'], space: 'Small grid', age: ['10U', '12U', '14U'] },
    coachingCues: ['Run through the ball.', 'Protect before you look.', 'Win first, pass second.'],
    commonMistakes: ['Stopping before the scoop.', 'Scooping upright.', 'Exposing the stick after possession.'],
    evidence: [{ text: 'Players compete for the loose ball, run through the scoop, and find the outlet.', location: 'Foundation description' }],
    sourceUrl: '',
    updated: 'Foundation'
  }
];

const skillFramework = {
  name: 'Ground Balls',
  definition: 'Gain possession of a loose ball while maintaining body control, protecting possession, and making the next useful decision.',
  components: ['Approach', 'Athletic Position', 'Hand Placement', 'Scoop Through', 'Stick Protection', 'First Three Steps', 'Exit Direction', 'Outlet Recognition'],
  purposeRule: 'Tag Ground Balls only when gaining, securing, or exiting possession from a loose-ball situation is a central learning purpose.'
};

export default function Home() {
  const [active, setActive] = useState('Atlas');
  const [mode, setMode] = useState('link');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState(null);
  const [sourceMeta, setSourceMeta] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [internalMode, setInternalMode] = useState(false);
  const [drills, setDrills] = useState(seedDrills);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState('All');
  const [selectedSkillId, setSelectedSkillId] = useState(CVIL[0]?.id || '');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('coachvault-atlas-alpha');
      if (stored) {
        const migrated = JSON.parse(stored).map((item) => ({
          ...item,
          folder: suggestedFolderFor(item)
        }));
        setDrills(migrated);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    localStorage.setItem('coachvault-atlas-alpha', JSON.stringify(drills));
  }, [drills]);

  useEffect(() => {
    if (!loading) {
      setProgressStep(0);
      return;
    }
    const timer = setInterval(() => {
      setProgressStep((current) => Math.min(current + 1, 6));
    }, 900);
    return () => clearInterval(timer);
  }, [loading]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return drills.filter((d) => {
      const matchesSearch = JSON.stringify(d).toLowerCase().includes(q);
      const matchesFolder = folderFilter === 'All' || (d.folder || suggestedFolderFor(d)) === folderFilter;
      return matchesSearch && matchesFolder;
    });
  }, [drills, search, folderFilter]);

  const folders = useMemo(() => {
    return ['All', ...Array.from(new Set(drills.map((d) => d.folder || suggestedFolderFor(d))))];
  }, [drills]);

  async function runEngine() {
    setError('');
    setResult(null);
    setDiagnostics(null);
    setLoading(true);
    try {
      const response = await fetch('/api/engine/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, url, text, transcript, atlasMode: true })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The Engine could not complete the analysis.');
      const analyzed = { ...data.analysis, sourceUrl: data.analysis?.sourceUrl || url || '' };
      setResult({ ...analyzed, folder: suggestedFolderFor(analyzed) });
      setSourceMeta(data.sourceMeta || null);
      setDiagnostics(data.diagnostics || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function updateResult(path, value) {
    setResult((current) => {
      const next = structuredClone(current);
      const parts = path.split('.');
      let cursor = next;
      parts.slice(0, -1).forEach((p) => cursor = cursor[p]);
      cursor[parts.at(-1)] = value;
      return next;
    });
  }

  function updateWeighted(group, index, field, value) {
    setResult((current) => ({
      ...current,
      [group]: (current[group] || []).map((item, i) =>
        i === index ? { ...item, [field]: field === 'weight' ? Number(value) : value } : item
      )
    }));
  }

  function approve() {
    const asset = {
      ...result,
      id: Date.now(),
      status: 'Approved',
      folder: suggestedFolderFor(result),
      sourceType: sourceMeta?.platform || (mode === 'link' ? 'Web / Social Link' : 'Pasted Text'),
      sourceUrl: result.sourceUrl || url,
      updated: 'Just now'
    };
    setDrills((current) => [asset, ...current]);
    setResult(null);
    setDiagnostics(null);
    setUrl('');
    setText('');
    setTranscript('');
    setActive('Database');
    setSelected(null);
  }

  return (
    <main className="appShell">
      <header className="globalHeader">
        <div className="brandLockup">
          <span className="brandMark">CV</span>
          <div><b>CoachVault</b><small>Engine 1.4</small></div>
        </div>
        <div className="globalSearch">Search drills, skills, and sources</div>
        <div className="headerActions">
          <label className="modeToggle"><input type="checkbox" checked={internalMode} onChange={(e) => setInternalMode(e.target.checked)} /><span>Internal tools</span></label>
          <span className="avatar">J</span>
        </div>
      </header>

      <nav className="sectionNav">
        {['Atlas', 'Database', 'Skills', 'Test Results'].map((item) => (
          <button key={item} className={active === item ? 'active' : ''} onClick={() => setActive(item)}>{item}</button>
        ))}
      </nav>

      <div className="workspaceShell">
        <aside className="iconRail">
          <button className={active === 'Atlas' ? 'active' : ''} onClick={() => setActive('Atlas')}><span>⚙</span><small>Engine</small></button>
          <button className={active === 'Database' ? 'active' : ''} onClick={() => setActive('Database')}><span>▣</span><small>Vault</small></button>
          <button className={active === 'Skills' ? 'active' : ''} onClick={() => setActive('Skills')}><span>◎</span><small>Skills</small></button>
          <button className={active === 'Test Results' ? 'active' : ''} onClick={() => setActive('Test Results')}><span>✓</span><small>Tests</small></button>
        </aside>

        <section className="main">
          <header className="pageHeader">
            <div>
              <small>COACHVAULT WORKSPACE</small>
              <h1>{active}</h1>
              <p>{active === 'Atlas' ? 'Add a source and turn it into a structured coaching asset.' : active === 'Database' ? 'Review and organize approved items in your Vault.' : active === 'Skills' ? 'Manage the skill language that powers the Engine.' : 'Measure how consistently the Engine understands coaching content.'}</p>
            </div>
            <div className="headerMetrics">
              <span><b>{drills.length}</b><small>Approved</small></span>
              <span><b>{CVIL.length}</b><small>Standards</small></span>
            </div>
          </header>

        {active === 'Atlas' && !result && (
          <>
            <section className="welcomeStrip">
              <div>
                <span>ENGINE WORKSPACE</span>
                <h2>What would you like CoachVault to analyze?</h2>
                <p>Paste a link, paste text, or upload a file. CoachVault will organize the result before anything enters your Vault.</p>
              </div>
              <button onClick={() => setActive('Database')}>Open Vault</button>
            </section>
            <section className="inputPanel inputPanelTop simplifiedPanel">
              <div className="tabs">
                <button className={mode === 'link' ? 'active' : ''} onClick={() => setMode('link')}>Web / Social Link</button>
                <button className={mode === 'text' ? 'active' : ''} onClick={() => setMode('text')}>Paste Text</button>
                <button className={mode === 'file' ? 'active' : ''} onClick={() => setMode('file')}>Upload File</button>
              </div>

              {mode === 'link' && <div className="inputBody">
                <label>Website, YouTube, Instagram, or TikTok URL</label>
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a public coaching link..." />
                <details><summary>Paste transcript or source text as a fallback</summary><textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Optional transcript..." /></details>
                <button disabled={!url.trim()} onClick={runEngine}>Analyze with CoachVault</button>
              </div>}

              {mode === 'text' && <div className="inputBody">
                <label>Drill description, transcript, or coaching notes</label>
                <textarea className="large" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste content for the Engine to analyze..." />
                <button disabled={!text.trim()} onClick={runEngine}>Analyze with CoachVault</button>
              </div>}

              {mode === 'file' && <div className="inputBody placeholder">
                <h3>File ingestion is staged next.</h3>
                <p>PDF, DOCX, PPTX, image, and video upload will feed this same analysis and review workflow.</p>
              </div>}

              {loading && <EngineProgress step={progressStep} />}
              {error && <div className="error"><b>Engine stopped</b><p>{error}</p></div>}
            </section>

            <section className="frameworkNote">
              <div><small>ACTIVE SKILL FRAMEWORK</small><b>{skillFramework.name}</b></div>
              <p>{skillFramework.purposeRule}</p>
            </section>
          </>
        )}

        {active === 'Atlas' && result && <Review result={result} sourceMeta={sourceMeta} diagnostics={diagnostics} internalMode={internalMode} updateResult={updateResult} updateWeighted={updateWeighted} approve={approve} discard={() => { setResult(null); setDiagnostics(null); }} />}

        {active === 'Database' && (
          <>
            <section className="sectionSummary"><span>APPROVED CONTENT</span><h2>Your Vault</h2><p>Organized coaching assets, each linked to its original source.</p></section>
            <div className="toolbar vaultToolbar">
              <select value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)}>{folders.map((folder) => <option key={folder}>{folder}</option>)}</select>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your Vault..." />
              <button onClick={() => setActive('Atlas')}>+ Add Source</button>
            </div>
            <div className="cards">{filtered.map((item) => <DrillCard key={item.id} item={item} onClick={() => setSelected(item)} />)}</div>
          </>
        )}

        {active === 'Skills' && <CVILLibrary selectedSkillId={selectedSkillId} setSelectedSkillId={setSelectedSkillId} />}
        {active === 'Test Results' && <TestResults drills={drills} />}
        </section>
      </div>

      {selected && <Detail item={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}


function EngineProgress({ step }) {
  const stages = [
    'Reading the source',
    'Identifying the activity',
    'Finding the primary skill',
    'Scoring skill components',
    'Separating supporting skills',
    'Attaching evidence',
    'Preparing your review'
  ];

  return <section className="engineProgress">
    <div className="enginePulse"><span></span></div>
    <div>
      <small>COACHVAULT ENGINE</small>
      <h3>{stages[Math.min(step, stages.length - 1)]}</h3>
      <div className="progressTrack"><span style={{ width: `${Math.max(8, ((step + 1) / stages.length) * 100)}%` }} /></div>
      <div className="progressSteps">
        {stages.map((stage, index) => <span className={index < step ? 'done' : index === step ? 'current' : ''} key={stage}>{index < step ? '✓' : index + 1}</span>)}
      </div>
    </div>
  </section>
}

function Review({ result, sourceMeta, diagnostics, internalMode, updateResult, updateWeighted, approve, discard }) {
  const primary = result.primarySkill || { name: '', weight: 0, reason: '' };
  return <section className="review">
    <header className="reviewHead">
      <div><span>REVIEW & CONFIRM</span><h2>Check what CoachVault found.</h2><p>Make quick corrections now. Larger edits remain available after the drill enters your Vault.</p></div>
      <div className="confidence"><small>ENGINE CONFIDENCE</small><b>{result.confidence?.overall || 0}%</b><p>{result.confidence?.notes || ''}</p></div>
    </header>

    {sourceMeta && <div className="source"><div><small>SOURCE</small><b>{sourceMeta.title || sourceMeta.platform || 'Submitted source'}</b><span>{sourceMeta.author || ''}</span></div></div>}

    <section className="resultSnapshot">
      <div>
        <small>PRIMARY SKILL</small>
        <h3>{primary.name || 'Needs review'}</h3>
        <p>{primary.reason || 'CoachVault did not provide a reason.'}</p>
      </div>
      <div className="snapshotScore"><b>{primary.weight || 0}</b><span>relevance</span></div>
      <div className="snapshotComponents">
        {(result.skillComponents || []).slice(0, 5).map((item) => <span key={item.name}><b>{item.weight}</b>{item.name}</span>)}
      </div>
    </section>


    <div className="reviewGrid">
      <div className="reviewMain">
        <Field label="Drill title"><input value={result.title || ''} onChange={(e) => updateResult('title', e.target.value)} /></Field>
        <Field label="Summary"><textarea value={result.summary || ''} onChange={(e) => updateResult('summary', e.target.value)} /></Field>
        <Field label="Teaching method"><select value={result.teachingMethod || 'Drill'} onChange={(e) => updateResult('teachingMethod', e.target.value)}>{['Individual Technique','Partner Activity','Station','Competitive Drill','Small-Sided Competition','Small-Sided Game','Team Activity','Progression','Film / Demonstration','Other'].map(x => <option key={x}>{x}</option>)}</select></Field>

        <section className="primarySkill">
          <small>PRIMARY SKILL</small>
          <div className="primaryRow">
            <input value={primary.name} onChange={(e) => updateResult('primarySkill.name', e.target.value)} />
            <strong>{primary.weight}</strong>
          </div>
          <input type="range" min="0" max="100" value={primary.weight} onChange={(e) => updateResult('primarySkill.weight', Number(e.target.value))} />
          <textarea value={primary.reason || ''} onChange={(e) => updateResult('primarySkill.reason', e.target.value)} />
        </section>

        <Weighted title="Skill Components" subtitle="The teachable parts of the primary skill" group="skillComponents" items={result.skillComponents || []} update={updateWeighted} />
        <Weighted title="Supporting Skills" subtitle="Meaningful outcomes that are not the central purpose" group="supportingSkills" items={result.supportingSkills || []} update={updateWeighted} />
        <Weighted title="Incidental Actions" subtitle="Actions present in the drill but normally excluded from classification" group="incidentalActions" items={result.incidentalActions || []} update={updateWeighted} showReason />

        <section className="section">
          <small>LEARNING OBJECTIVES</small>
          <textarea value={(result.learningObjectives || []).join('\n')} onChange={(e) => updateResult('learningObjectives', e.target.value.split('\n').filter(Boolean))} />
        </section>

        <section className="section">
          <small>EVIDENCE</small>
          {(result.evidence || []).map((e, i) => <div className="evidence" key={i}><b>{e.location || `Evidence ${i+1}`}</b><p>{e.text}</p></div>)}
        </section>
      </div>

      <aside className="reviewSide">
        <Field label="Vault folder"><select value={result.folder || 'Skills'} onChange={(e) => updateResult('folder', e.target.value)}>{['Skills','Offense','Defense','Transition','Goalie','Faceoffs','Practice Plans','Culture','Player Development','Unfiled'].map(x => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Original source link"><input value={result.sourceUrl || sourceMeta?.url || ''} onChange={(e) => updateResult('sourceUrl', e.target.value)} placeholder="Original video, article, or document link" /></Field>
        <Field label="Players"><input value={result.setup?.players || ''} onChange={(e) => updateResult('setup.players', e.target.value)} /></Field>
        <Field label="Duration"><input type="number" value={result.setup?.duration || ''} onChange={(e) => updateResult('setup.duration', Number(e.target.value))} /></Field>
        <Field label="Equipment"><textarea value={(result.setup?.equipment || []).join(', ')} onChange={(e) => updateResult('setup.equipment', e.target.value.split(',').map(x => x.trim()).filter(Boolean))} /></Field>
        <Field label="Space"><input value={result.setup?.space || ''} onChange={(e) => updateResult('setup.space', e.target.value)} /></Field>
        <Field label="Age suitability"><input value={(result.setup?.age || []).join(', ')} onChange={(e) => updateResult('setup.age', e.target.value.split(',').map(x => x.trim()).filter(Boolean))} /></Field>
        <ListBlock title="Coaching Cues" items={result.coachingCues || []} path="coachingCues" updateResult={updateResult} />
        <ListBlock title="Common Mistakes" items={result.commonMistakes || []} path="commonMistakes" updateResult={updateResult} />
        <ListBlock title="Constraints" items={result.constraints || []} path="constraints" updateResult={updateResult} />
      </aside>
    </div>


    {internalMode && <DebugPanel diagnostics={diagnostics} result={result} />}

    <footer><button className="discard" onClick={discard}>Discard</button><button className="approve" onClick={approve}>Approve to Database</button></footer>
  </section>
}


function DebugPanel({ diagnostics, result }) {
  const [open, setOpen] = useState(false);
  const stages = diagnostics?.stages || [];
  const checks = diagnostics?.fieldChecks || [];
  const missing = diagnostics?.missingFields || [];

  return <section className="debugPanel">
    <button className="debugToggle" onClick={() => setOpen(!open)}>
      <span><b>Engine Debug Panel</b><small>Internal only · shows what the Engine returned before approval</small></span>
      <strong>{open ? 'Hide' : 'Show'}</strong>
    </button>

    {open && <div className="debugBody">
      <div className="debugSummary">
        <article><small>PIPELINE</small><b>{stages.filter(x => x.status === 'pass').length}/{stages.length || 0}</b><span>stages passed</span></article>
        <article><small>SCHEMA</small><b>{checks.filter(x => x.status === 'pass').length}/{checks.length || 0}</b><span>required fields passed</span></article>
        <article className={missing.length ? 'warn' : 'good'}><small>MISSING</small><b>{missing.length}</b><span>{missing.length ? 'fields need attention' : 'required fields'}</span></article>
      </div>

      <div className="debugColumns">
        <div>
          <h3>Pipeline stages</h3>
          <div className="stageList">
            {stages.map((stage, i) => <div className={`stage ${stage.status}`} key={`${stage.name}-${i}`}>
              <span className="stageIcon">{stage.status === 'pass' ? '✓' : stage.status === 'warn' ? '!' : '×'}</span>
              <div><b>{stage.name}</b><p>{stage.detail}</p></div>
            </div>)}
          </div>
        </div>

        <div>
          <h3>Structured-field checks</h3>
          <div className="stageList">
            {checks.map((check, i) => <div className={`stage ${check.status}`} key={`${check.field}-${i}`}>
              <span className="stageIcon">{check.status === 'pass' ? '✓' : '!'}</span>
              <div><b>{check.field}</b><p>{check.detail}</p></div>
            </div>)}
          </div>
        </div>
      </div>

      {missing.length > 0 && <div className="missingBox"><b>Why the database card may look incomplete</b><p>The Engine returned no usable value for: {missing.join(', ')}. Review or rerun the source before approval.</p></div>}

      <details className="rawJson">
        <summary>View raw Engine JSON</summary>
        <pre>{JSON.stringify(result, null, 2)}</pre>
      </details>

      <details className="rawJson">
        <summary>View diagnostic metadata</summary>
        <pre>{JSON.stringify(diagnostics, null, 2)}</pre>
      </details>
    </div>}
  </section>
}

function Weighted({ title, subtitle, group, items, update, showReason=false }) {
  return <section className="section"><small>{title.toUpperCase()}</small><p>{subtitle}</p>{items.map((x, i) => <div className="weighted" key={i}><input value={x.name || ''} onChange={(e) => update(group, i, 'name', e.target.value)} /><b>{x.weight || 0}</b><input type="range" min="0" max="100" value={x.weight || 0} onChange={(e) => update(group, i, 'weight', e.target.value)} /><textarea className="weightReason" value={x.reason || ''} onChange={(e) => update(group, i, 'reason', e.target.value)} placeholder="Why did this earn this score?" /></div>)}</section>
}

function Field({ label, children }) { return <label className="field"><span>{label}</span>{children}</label>; }

function ListBlock({ title, items, path, updateResult }) {
  return <div className="listBlock"><small>{title.toUpperCase()}</small><textarea value={items.join('\n')} onChange={(e) => updateResult(path, e.target.value.split('\n').filter(Boolean))} /></div>
}

function DrillCard({ item, onClick }) {
  return <article className="card" onClick={onClick}><header><span>{item.folder || suggestedFolderFor(item)}</span><small>{item.sourceType}</small></header><h3>{item.title}</h3><p>{item.summary}</p><div className="primaryTag"><b>{item.primarySkill?.weight}</b>{item.primarySkill?.name}</div><div className="pills">{(item.skillComponents || []).slice(0,4).map(x => <span key={x.name}>{x.name} {x.weight}</span>)}</div><footer><b>{item.teachingMethod}</b><span>{item.updated}</span></footer></article>
}

function Detail({ item, onClose }) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return <div className="detailOverlay" onClick={onClose}>
    <button className="fixedDetailClose" onClick={onClose} aria-label="Close drill details">×</button>
    <article className="detailDrawer" onClick={(e) => e.stopPropagation()}>
      <header className="detailHeader">
        <div>
          <span>{item.folder || suggestedFolderFor(item).toUpperCase()} · APPROVED DRILL</span>
          <h2>{item.title}</h2>
        </div>
        
      </header>

      <div className="detailBody">
        <p className="detailSummary">{item.summary}</p>

        {item.sourceUrl && <a className="sourceLink detailSourceLink" href={item.sourceUrl} target="_blank" rel="noreferrer">Open original source</a>}

        <section className="detailSection">
          <h3>Primary Skill</h3>
          <div className="primaryTag large"><b>{item.primarySkill?.weight}</b>{item.primarySkill?.name}</div>
          {item.primarySkill?.reason && <p>{item.primarySkill.reason}</p>}
        </section>

        <section className="detailSection">
          <h3>Skill Components</h3>
          {(item.components || item.skillComponents || []).length ? (
            <div className="detailComponents">
              {(item.components || item.skillComponents || []).map((component) => <article key={component.name}>
                <div className="componentScore"><b>{component.weight}</b><span>{component.name}</span></div>
                {component.reason && <p>{component.reason}</p>}
                {component.objectives?.length > 0 && <div className="objectiveList">
                  <small>OBJECTIVES</small>
                  {component.objectives.map((objective) => <div key={objective.name}>
                    <b>{objective.weight}</b>
                    <span>{objective.name}</span>
                    {objective.reason && <p>{objective.reason}</p>}
                  </div>)}
                </div>}
              </article>)}
            </div>
          ) : <p className="emptyDetail">No skill components were saved for this item.</p>}
        </section>

        <section className="detailSection">
          <h3>Learning Objectives</h3>
          <ul>{(item.learningObjectives || []).map(x => <li key={x}>{x}</li>)}</ul>
        </section>

        <section className="detailSection twoColumnDetail">
          <div>
            <h3>Coaching Cues</h3>
            <ul>{(item.coachingCues || []).map(x => <li key={x}>{x}</li>)}</ul>
          </div>
          <div>
            <h3>Common Mistakes</h3>
            <ul>{(item.commonMistakes || []).map(x => <li key={x}>{x}</li>)}</ul>
          </div>
        </section>

        <section className="detailSection twoColumnDetail">
          <div>
            <h3>Setup</h3>
            <p><b>Players:</b> {item.setup?.players || 'Not stated'}</p>
            <p><b>Duration:</b> {item.setup?.duration ? `${item.setup.duration} minutes` : 'Not stated'}</p>
            <p><b>Space:</b> {item.setup?.space || 'Not stated'}</p>
          </div>
          <div>
            <h3>Equipment</h3>
            <ul>{(item.setup?.equipment || []).map(x => <li key={x}>{x}</li>)}</ul>
          </div>
        </section>

        {item.evidence?.length > 0 && <section className="detailSection">
          <h3>Source Evidence</h3>
          {item.evidence.map((e, i) => <div className="evidence" key={i}>
            <b>{e.location || `Evidence ${i + 1}`}</b>
            <p>{e.text}</p>
          </div>)}
        </section>}
      </div>

      <footer className="detailFooter">
        {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer">View source</a>}
        <button onClick={onClose}>Done</button>
      </footer>
    </article>
  </div>
}


function CVILLibrary({ selectedSkillId, setSelectedSkillId }) {
  const selected = CVIL.find((skill) => skill.id === selectedSkillId) || CVIL[0];

  return <>
    <section className="cvilTopStrip">
      <div>
        <small>COACHVAULT INTELLIGENCE LIBRARY</small>
        <h2>{CVIL.length} Skill Standards</h2>
      </div>
      <div className="cvilTopSkills">
        {CVIL.map((skill) => <button key={skill.id} className={selected?.id === skill.id ? 'active' : ''} onClick={() => setSelectedSkillId(skill.id)}>
          {skill.name}
        </button>)}
      </div>
    </section>

    <section className="cvilPage">
      <aside className="cvilSidebar">
      <div>
        <small>COACHVAULT INTELLIGENCE LIBRARY</small>
        <h2>CVIL v1</h2>
        <p>The structured coaching knowledge that powers the Engine.</p>
      </div>
      <div className="skillList">
        {CVIL.map((skill) => <button key={skill.id} className={selected?.id === skill.id ? 'active' : ''} onClick={() => setSelectedSkillId(skill.id)}>
          <span>{skill.name}</span><small>{skill.components.length} components</small>
        </button>)}
      </div>
    </aside>

    <article className="standardPage">
      <header>
        <span>{selected.category}</span>
        <h2>{selected.name}</h2>
        <p className="standardDefinition">{selected.definition}</p>
        <div className="standardPrinciple"><small>COACHVAULT PRINCIPLE</small><b>{selected.coachPrinciple}</b></div>
      </header>

      <section className="standardOverview">
        <div><small>PURPOSE</small><p>{selected.purpose}</p></div>
        <div><small>SKILL ARCHITECTURE</small><p>{selected.components.map(x => x.name).join(' → ')}</p></div>
      </section>

      <div className="componentStack">
        {selected.components.map((component, index) => <details key={component.id} open={index === 0}>
          <summary><span>{String(index + 1).padStart(2, '0')}</span><div><b>{component.name}</b><small>{component.purpose}</small></div><strong>{component.objectives.length} objective{component.objectives.length === 1 ? '' : 's'}</strong></summary>
          <div className="componentBody">
            {component.objectives.map((objective) => <section className="objectiveCard" key={objective.id}>
              <h4>{objective.name}</h4>
              <div className="objectiveGrid">
                <div><small>OBSERVABLE BEHAVIORS</small><ul>{objective.observableBehaviors.map(x => <li key={x}>{x}</li>)}</ul></div>
                <div><small>COACHING CUES</small><ul>{objective.coachingCues.map(x => <li key={x}>{x}</li>)}</ul></div>
                <div><small>COMMON MISTAKES</small><ul>{objective.commonMistakes.map(x => <li key={x}>{x}</li>)}</ul></div>
                <div><small>CORRECTIONS</small><ul>{objective.corrections.map(x => <li key={x}>{x}</li>)}</ul></div>
              </div>
              <div className="progressionLine"><small>PROGRESSION</small><span>{objective.progressions.join(' → ')}</span></div>
            </section>)}
          </div>
        </details>)}
      </div>
    </article>
  </section>
  </>
}

function Framework() {
  return <section className="framework"><span>SKILL FRAMEWORK 001</span><h2>Ground Balls</h2><p className="lead">{skillFramework.definition}</p><h3>Skill Components</h3><div className="frameworkGrid">{skillFramework.components.map((x, i) => <article key={x}><b>{String(i+1).padStart(2,'0')}</b><h4>{x}</h4><p>A standardized component the Engine may identify and weight when it is intentionally developed.</p></article>)}</div><div className="rule"><b>Engine Rule</b><p>{skillFramework.purposeRule}</p></div></section>
}

function TestResults({ drills }) {
  const reviewed = drills.filter(x => x.sourceType !== 'CoachVault Foundation');
  return <section className="framework"><span>ENGINE EVALUATION</span><h2>Atlas Test Results</h2><p className="lead">Use the same sources repeatedly while refining the Engine. The goal is consistent skill classification, not longer output.</p><div className="metrics"><article><b>{reviewed.length}</b><span>Sources tested</span></article><article><b>{drills.length}</b><span>Approved drills</span></article><article><b>{reviewed.length ? Math.round(reviewed.reduce((s,x)=>s+(x.confidence?.overall||0),0)/reviewed.length) : 0}%</b><span>Average confidence</span></article></div><h3>Manual evaluation questions</h3><ol><li>Did the Engine identify the drill's true primary skill?</li><li>Did it identify the right skill components?</li><li>Did it avoid tagging incidental actions?</li><li>Did the evidence support the classification?</li><li>Would the approved data help assemble a practice?</li></ol></section>
}
