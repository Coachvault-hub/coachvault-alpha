'use client';

import { useEffect, useMemo, useState } from 'react';

const initialVault = [
  {
    id: 1,
    title: 'Ground Ball Advantage Drill',
    resourceType: 'Drill',
    summary: 'Competitive small-sided work for approach angles, communication, and the first pass after possession.',
    primaryPurpose: 'Teach players to win contested ground balls and immediately transition into useful possession.',
    purposeTags: [
      { name: 'Ground Balls', weight: 96, reason: 'Winning and exiting the ground-ball contest is the core objective.' },
      { name: 'Transition', weight: 76, reason: 'The drill emphasizes the first decision after possession.' }
    ],
    context: { ageGroups: ['U12'], difficulty: 'Intermediate', estimatedDurationMinutes: 12, playerCount: '6-12', equipment: ['balls', 'cones'], fieldArea: 'Small grid' },
    coachingPoints: ['Run through the ball.', 'Protect the stick before looking up.', 'Make the first pass quickly.'],
    drills: [],
    sourceMeta: { platform: 'CoachVault' },
    updated: 'Yesterday'
  }
];

const stages = ['Reading source', 'Extracting coaching purpose', 'Scoring purpose tags', 'Breaking out drills', 'Building coach review'];

export default function Home() {
  const [active, setActive] = useState('Engine');
  const [mode, setMode] = useState('link');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState(null);
  const [sourceMeta, setSourceMeta] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [vault, setVault] = useState(initialVault);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('coachvault-v05');
      if (stored) setVault(JSON.parse(stored));
    } catch (_) {}
  }, []);

  useEffect(() => {
    localStorage.setItem('coachvault-v05', JSON.stringify(vault));
  }, [vault]);

  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => setStage((current) => Math.min(current + 1, stages.length - 1)), 900);
    return () => clearInterval(timer);
  }, [loading]);

  const filteredVault = useMemo(() => {
    const needle = search.toLowerCase();
    return vault.filter((item) => `${item.title} ${item.resourceType} ${item.summary} ${(item.purposeTags || []).map((tag) => tag.name).join(' ')}`.toLowerCase().includes(needle));
  }, [vault, search]);

  async function analyze() {
    setError('');
    setResult(null);
    setSourceMeta(null);
    setLoading(true);
    setStage(0);
    try {
      const response = await fetch('/api/engine/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, url, text, transcript })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The Engine could not complete the analysis.');
      setResult(data.analysis);
      setSourceMeta(data.sourceMeta || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function updateField(field, value) {
    setResult((current) => ({ ...current, [field]: value }));
  }

  function updateContext(field, value) {
    setResult((current) => ({ ...current, context: { ...current.context, [field]: value } }));
  }

  function updateTag(index, field, value) {
    setResult((current) => ({
      ...current,
      purposeTags: current.purposeTags.map((tag, i) => i === index ? { ...tag, [field]: field === 'weight' ? Number(value) : value } : tag)
    }));
  }

  function removeTag(index) {
    setResult((current) => ({ ...current, purposeTags: current.purposeTags.filter((_, i) => i !== index) }));
  }

  function addTag() {
    setResult((current) => ({ ...current, purposeTags: [...(current.purposeTags || []), { name: 'New Tag', weight: 60, reason: 'Coach-added purpose tag.' }] }));
  }

  function saveToVault() {
    const asset = {
      ...result,
      id: Date.now(),
      sourceMeta: sourceMeta || { platform: mode === 'link' ? 'Web' : mode === 'text' ? 'Pasted text' : 'File' },
      sourceUrl: url,
      updated: 'Just now'
    };
    setVault((current) => [asset, ...current]);
    setResult(null);
    setUrl('');
    setText('');
    setTranscript('');
    setActive('Vault');
    setSelected(asset);
  }

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brand"><span>CV</span><div><b>CoachVault</b><small>The Engine builds it. The Vault remembers it.</small></div></div>
        <nav>
          {['Engine', 'Vault', 'Team Spaces', 'Settings'].map((item) => (
            <button key={item} className={active === item ? 'active' : ''} onClick={() => setActive(item)}>
              <span>{item === 'Engine' ? '⚙' : item === 'Vault' ? '▣' : item === 'Team Spaces' ? '◎' : '◌'}</span>{item}
            </button>
          ))}
        </nav>
        <div className="sidePrinciple"><small>ENGINE PRINCIPLE</small><b>Tag the purpose, not every action.</b><p>A drill earns a Ground Balls tag because ground-ball development is central—not merely because a ball touches the ground.</p></div>
        <div className="version">CoachVault v0.5.1</div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><small>COACHING KNOWLEDGE SYSTEM</small><h1>{active}</h1></div>
          <button className="vaultButton" onClick={() => setActive('Vault')}>Open My Vault <span>{vault.length}</span></button>
        </header>

        {active === 'Engine' && (
          <>
            <section className="engineHero">
              <div><span className="eyebrow">COACHVAULT ENGINE</span><h2>Give it raw coaching material.<br />Get back something useful.</h2><p>The Engine analyzes purpose, separates drills, scores meaningful tags, and prepares an editable coaching asset before anything enters your Vault.</p></div>
              <div className="engineFlow"><span>INPUT</span><b>→</b><span>AI ENGINE</span><b>→</b><span>COACH REVIEW</span><b>→</b><span>VAULT</span></div>
            </section>

            {!result && !loading && (
              <section className="enginePanel">
                <div className="inputTabs">
                  <button className={mode === 'file' ? 'active' : ''} onClick={() => setMode('file')}><b>01</b><span>Upload File<small>PDF, DOCX, PPTX, images</small></span></button>
                  <button className={mode === 'text' ? 'active' : ''} onClick={() => setMode('text')}><b>02</b><span>Paste Text<small>Notes, plans, emails, AI output</small></span></button>
                  <button className={mode === 'link' ? 'active' : ''} onClick={() => setMode('link')}><b>03</b><span>Web / Social Link<small>YouTube transcription + analysis</small></span></button>
                </div>

                <div className="inputBody">
                  {mode === 'file' && <div className="comingSoon"><div>⇧</div><h3>File extraction is next</h3><p>The v0.5 live test focuses on YouTube and pasted text. PDF and Word parsing will plug into the same review pipeline.</p></div>}
                  {mode === 'text' && <><label>Paste coaching material</label><textarea className="largeText" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a drill, practice plan, coaching article, notes, or transcript..." /><button className="runButton" disabled={!text.trim()} onClick={analyze}>Run CoachVault Engine →</button></>}
                  {mode === 'link' && <>
                    <label>YouTube URL</label>
                    <input className="urlInput" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
                    <details className="transcriptFallback"><summary>Optional fallback: paste the transcript</summary><textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Paste the video transcript here..." /></details>
                    <div className="enginePromise"><div><b>What the Engine will produce</b><p>Primary purpose, weighted and omitted tags, coaching cues, drill breakdowns, context, confidence, and an Engine Report.</p></div><span>REAL AI</span></div>
                    <button className="runButton" disabled={!url.trim()} onClick={analyze}>Run Video Through Engine →</button>
                  </>}
                  {error && <div className="errorBox"><b>Engine stopped</b><p>{error}</p></div>}
                </div>
              </section>
            )}

            {loading && <Processing stage={stage} />}
            {result && <Review result={result} sourceMeta={sourceMeta} updateField={updateField} updateContext={updateContext} updateTag={updateTag} removeTag={removeTag} addTag={addTag} saveToVault={saveToVault} discard={() => setResult(null)} />}
          </>
        )}

        {active === 'Vault' && (
          <>
            <section className="pageIntro"><span>MY COACHING KNOWLEDGE</span><h2>The Vault</h2><p>Everything here has passed through the Engine and coach review. Search it, open it, make larger edits, and eventually publish it to a Team Space.</p></section>
            <div className="vaultToolbar"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search titles, purpose tags, summaries..." /><button onClick={() => setActive('Engine')}>+ Run Engine</button></div>
            <div className="vaultGrid">{filteredVault.map((item) => <VaultCard key={item.id} item={item} onClick={() => setSelected(item)} />)}</div>
          </>
        )}

        {active === 'Team Spaces' && <Empty title="Team Spaces" text="This is where coaches will publish selected Vault assets to players. Creation and analysis stay inside the Engine; private knowledge stays inside the Vault." />}
        {active === 'Settings' && <Empty title="Engine Settings" text="Future settings will include preferred terminology, age-group mappings, tag vocabulary, coaching philosophy, and AI model configuration." />}
      </section>

      {selected && <VaultDetail item={selected} onClose={() => setSelected(null)} onSave={(updated) => { setVault((items) => items.map((item) => item.id === updated.id ? updated : item)); setSelected(updated); }} />}
    </main>
  );
}

function Processing({ stage }) {
  return <section className="processing"><div className="spinner">CV</div><span className="eyebrow">COACHVAULT ENGINE RUNNING</span><h2>Turning raw material into coaching knowledge.</h2><div className="stageList">{stages.map((item, index) => <div key={item} className={index <= stage ? 'done' : ''}><span>{index < stage ? '✓' : index === stage ? '•••' : '○'}</span><b>{item}</b></div>)}</div><p>The Engine is looking for what the content is actually trying to teach—not simply counting lacrosse words.</p></section>;
}

function Review({ result, sourceMeta, updateField, updateContext, updateTag, removeTag, addTag, saveToVault, discard }) {
  return <section className="reviewShell">
    <header className="reviewHeader"><div><span className="eyebrow dark">REVIEW & CONFIRM</span><h2>The Engine produced this.</h2><p>Make quick corrections now. Once saved, the full asset can be edited inside your Vault.</p></div><div className="confidence"><small>OVERALL CONFIDENCE</small><b>{result.confidence?.overall || 0}%</b><span>{result.confidence?.notes || 'No limitations noted.'}</span></div></header>
    {sourceMeta?.thumbnail && <div className="sourceStrip"><img src={sourceMeta.thumbnail} alt="YouTube thumbnail" /><div><small>SOURCE</small><b>{sourceMeta.platform} · {sourceMeta.author}</b><small>{sourceMeta.transcriptProvider || ''}</small></div></div>}
    <div className="reviewGrid">
      <div className="reviewMain">
        <Field label="Title"><input value={result.title || ''} onChange={(e) => updateField('title', e.target.value)} /></Field>
        <div className="twoCol"><Field label="Resource type"><select value={result.resourceType || 'Other'} onChange={(e) => updateField('resourceType', e.target.value)}>{['Drill','Practice Plan','Coaching Concept','Team Talk','Video Analysis','Document','Other'].map((v) => <option key={v}>{v}</option>)}</select></Field><Field label="Save as"><select value={result.suggestedVaultAsset?.saveAs || result.resourceType} onChange={(e) => updateField('suggestedVaultAsset', { ...result.suggestedVaultAsset, saveAs: e.target.value })}>{['Drill','Practice Plan','Coaching Concept','Video Analysis','Document'].map((v) => <option key={v}>{v}</option>)}</select></Field></div>
        <Field label="Summary"><textarea value={result.summary || ''} onChange={(e) => updateField('summary', e.target.value)} /></Field>
        <Field label="Primary purpose"><textarea className="purposeField" value={result.primaryPurpose || ''} onChange={(e) => updateField('primaryPurpose', e.target.value)} /></Field>

        <section className="tagSection"><div className="sectionTitle"><div><small>PURPOSE TAGS</small><h3>Weighted by why this content exists</h3></div><button onClick={addTag}>+ Add tag</button></div>{(result.purposeTags || []).map((tag, index) => <div className="tagEditor" key={`${tag.name}-${index}`}><div><input value={tag.name} onChange={(e) => updateTag(index, 'name', e.target.value)} /><textarea value={tag.reason} onChange={(e) => updateTag(index, 'reason', e.target.value)} /></div><div className="weight"><b>{tag.weight}</b><input type="range" min="45" max="100" value={tag.weight} onChange={(e) => updateTag(index, 'weight', e.target.value)} /><small>{tag.weight >= 90 ? 'Core purpose' : tag.weight >= 70 ? 'Major purpose' : 'Supporting purpose'}</small></div><button className="remove" onClick={() => removeTag(index)}>×</button></div>)}</section>

        {(result.omittedTags || []).length > 0 && <section className="drillSection"><div className="sectionTitle"><div><small>INTENTIONALLY OMITTED</small><h3>Actions detected, but not treated as purpose</h3></div></div>{result.omittedTags.map((tag, index) => <article className="drillCard" key={`${tag.name}-${index}`}><span>{tag.estimatedWeight}</span><div><h4>{tag.name}</h4><p>{tag.reason}</p></div></article>)}</section>}
        {result.engineReport && <section className="drillSection"><div className="sectionTitle"><div><small>ENGINE REPORT</small><h3>{result.engineReport.itemsFound}</h3></div></div><article className="drillCard"><span>AI</span><div><h4>Strongest insight</h4><p>{result.engineReport.strongestInsight}</p>{(result.engineReport.reviewWarnings || []).map((warning, index) => <p key={index}><b>Verify:</b> {warning}</p>)}</div></article></section>}

        <section className="drillSection"><div className="sectionTitle"><div><small>CONTENT BREAKDOWN</small><h3>{result.drills?.length || 0} drill or segment{result.drills?.length === 1 ? '' : 's'} found</h3></div></div>{(result.drills || []).map((drill, index) => <article className="drillCard" key={`${drill.name}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><div><h4>{drill.name}</h4><p><b>Purpose:</b> {drill.purpose}</p><p><b>Setup:</b> {drill.setup}</p><div className="miniTags">{(drill.purposeTags || []).map((tag) => <em key={tag.name}>{tag.name} {tag.weight}</em>)}</div></div></article>)}</section>
      </div>

      <aside className="reviewAside">
        <h3>Context, not purpose</h3><p>These fields help coaches filter and use the asset without polluting the purpose tags.</p>
        <Field label="Age groups"><input value={(result.context?.ageGroups || []).join(', ')} onChange={(e) => updateContext('ageGroups', e.target.value.split(',').map((v) => v.trim()).filter(Boolean))} /></Field>
        <Field label="Difficulty"><select value={result.context?.difficulty || 'Not specified'} onChange={(e) => updateContext('difficulty', e.target.value)}>{['Beginner','Intermediate','Advanced','Mixed','Not specified'].map((v) => <option key={v}>{v}</option>)}</select></Field>
        <Field label="Duration (minutes)"><input type="number" value={result.context?.estimatedDurationMinutes ?? ''} onChange={(e) => updateContext('estimatedDurationMinutes', e.target.value ? Number(e.target.value) : null)} /></Field>
        <Field label="Player count"><input value={result.context?.playerCount || ''} onChange={(e) => updateContext('playerCount', e.target.value)} /></Field>
        <Field label="Equipment"><textarea value={(result.context?.equipment || []).join(', ')} onChange={(e) => updateContext('equipment', e.target.value.split(',').map((v) => v.trim()).filter(Boolean))} /></Field>
        <Field label="Field area"><input value={result.context?.fieldArea || ''} onChange={(e) => updateContext('fieldArea', e.target.value)} /></Field>
        <div className="coachingPoints"><small>COACHING POINTS</small>{(result.coachingPoints || []).map((point, index) => <p key={index}>{point}</p>)}</div>
      </aside>
    </div>
    <footer className="reviewActions"><button className="discard" onClick={discard}>Discard</button><button className="draft" onClick={() => alert('Draft queue will be connected next.')}>Save as Draft</button><button className="save" onClick={saveToVault}>Save to My Vault →</button></footer>
  </section>;
}

function Field({ label, children }) { return <label className="field"><span>{label}</span>{children}</label>; }

function VaultCard({ item, onClick }) {
  const strongest = [...(item.purposeTags || [])].sort((a, b) => b.weight - a.weight).slice(0, 3);
  return <article className="vaultCard" onClick={onClick}><header><span>{item.resourceType}</span><small>{item.updated}</small></header><h3>{item.title}</h3><p>{item.summary}</p><div className="vaultTags">{strongest.map((tag) => <span key={tag.name}><b>{tag.weight}</b>{tag.name}</span>)}</div><footer><small>PRIMARY PURPOSE</small><p>{item.primaryPurpose}</p></footer></article>;
}

function VaultDetail({ item, onClose, onSave }) {
  const [draft, setDraft] = useState(item);
  return <div className="modalBack"><article className="vaultDetail"><button className="close" onClick={onClose}>×</button><span className="eyebrow dark">FULL VAULT EDITOR</span><input className="detailTitle" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /><textarea className="detailSummary" value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} /><h3>Primary purpose</h3><textarea value={draft.primaryPurpose} onChange={(e) => setDraft({ ...draft, primaryPurpose: e.target.value })} /><h3>Purpose tags</h3><div className="detailTags">{(draft.purposeTags || []).map((tag) => <span key={tag.name}><b>{tag.weight}</b>{tag.name}<small>{tag.reason}</small></span>)}</div><h3>Coaching points</h3><textarea value={(draft.coachingPoints || []).join('\n')} onChange={(e) => setDraft({ ...draft, coachingPoints: e.target.value.split('\n') })} /><button className="save wide" onClick={() => onSave(draft)}>Save Larger Changes</button></article></div>;
}

function Empty({ title, text }) { return <section className="empty"><span>COACHVAULT v0.5</span><h2>{title}</h2><p>{text}</p></section>; }
