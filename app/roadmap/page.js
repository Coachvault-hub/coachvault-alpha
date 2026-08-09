'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const DEFAULT_RESOURCES = [
  {id:'coach-profile', phase:'Preseason Setup', title:'Coach Profile & Bio', type:'Form', due:'Before team launch', audience:'All coaches', required:true, description:'Collect coach bio, contact information, coaching experience, certifications, and apparel sizing.', url:''},
  {id:'helmet-order', phase:'Equipment & Apparel', title:'Helmet Ordering', type:'Form', due:'Before equipment deadline', audience:'Head coaches', required:true, description:'Submit helmet quantities, sizes, colors, and any player-specific ordering needs.', url:''},
  {id:'uniform-apparel', phase:'Equipment & Apparel', title:'Uniform & Apparel Check', type:'Task', due:'Before first practice', audience:'All teams', required:true, description:'Confirm uniform numbers, coach gear, and missing apparel before the season begins.', url:''},
  {id:'tournament-selection', phase:'Season Planning', title:'Tournament Selection', type:'Form', due:'Before schedule lock', audience:'Head coaches', required:true, description:'Submit preferred tournaments, blackout dates, travel tolerance, and any team-specific scheduling notes.', url:''},
  {id:'practice-availability', phase:'Season Planning', title:'Practice Availability', type:'Form', due:'Before field scheduling', audience:'Head coaches', required:true, description:'Collect preferred practice days, coach conflicts, and known facility limitations.', url:''},
  {id:'team-management', phase:'Team Management', title:'Roster & Contact Review', type:'Task', due:'Before parent meeting', audience:'Head coaches', required:true, description:'Verify roster, parent contacts, jersey numbers, and team communication channels.', url:''},
  {id:'parent-meeting', phase:'Team Management', title:'Parent Meeting Resources', type:'Document', due:'Before parent meeting', audience:'All coaches', required:false, description:'Provide program expectations, attendance standards, communication rules, and season calendar resources.', url:''},
  {id:'midseason', phase:'In Season', title:'Midseason Coach Check-In', type:'Form', due:'Midseason', audience:'All coaches', required:false, description:'Quick feedback on roster needs, schedule, player development, and support needed from the club.', url:''},
  {id:'summer-planning', phase:'Postseason', title:'Summer / Next Season Planning', type:'Form', due:'End of season', audience:'Head coaches', required:false, description:'Capture tournament feedback, returning-player outlook, coaching needs, and recommendations for the next cycle.', url:''},
];

const PHASES = ['Preseason Setup','Equipment & Apparel','Season Planning','Team Management','In Season','Postseason'];
const TYPES = ['Form','Document','Link','Task','Meeting'];

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) { return fallback; }
}

export default function SeasonRoadmapPage() {
  const [resources, setResources] = useState(DEFAULT_RESOURCES);
  const [completed, setCompleted] = useState({});
  const [view, setView] = useState('coach');
  const [phaseFilter, setPhaseFilter] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({
    phase:'Preseason Setup', title:'', type:'Form', due:'', audience:'All coaches',
    required:true, description:'', url:''
  });

  useEffect(() => {
    setResources(loadJson('coachvault-season-roadmap-v1', DEFAULT_RESOURCES));
    setCompleted(loadJson('coachvault-season-roadmap-completions-v1', {}));
  }, []);

  useEffect(() => {
    localStorage.setItem('coachvault-season-roadmap-v1', JSON.stringify(resources));
  }, [resources]);

  useEffect(() => {
    localStorage.setItem('coachvault-season-roadmap-completions-v1', JSON.stringify(completed));
  }, [completed]);

  const visible = useMemo(
    () => phaseFilter === 'All' ? resources : resources.filter(r => r.phase === phaseFilter),
    [resources, phaseFilter]
  );

  const doneCount = resources.filter(r => completed[r.id]).length;
  const required = resources.filter(r => r.required);
  const requiredDone = required.filter(r => completed[r.id]).length;
  const progress = required.length ? Math.round(requiredDone / required.length * 100) : 0;

  function toggleComplete(id) {
    setCompleted(current => ({...current, [id]: !current[id]}));
  }

  function addResource(e) {
    e.preventDefault();
    if (!draft.title.trim()) return;
    setResources(current => [...current, {
      ...draft,
      id:`resource-${Date.now()}`,
      title:draft.title.trim(),
      description:draft.description.trim(),
      url:draft.url.trim()
    }]);
    setDraft({phase:'Preseason Setup', title:'', type:'Form', due:'', audience:'All coaches', required:true, description:'', url:''});
    setShowAdd(false);
  }

  function removeResource(id) {
    setResources(current => current.filter(r => r.id !== id));
    setCompleted(current => {
      const next = {...current};
      delete next[id];
      return next;
    });
  }

  return (
    <main className="roadmapPage">
      <header className="roadmapTopbar">
        <Link href="/" className="roadmapBrand">
          <span className="roadmapLogo">CV</span>
          <div><strong>CoachVault</strong><small>Season Roadmap</small></div>
        </Link>
        <nav>
          <Link href="/">Home</Link>
          <Link href="/workspace">Workspace</Link>
          <Link href="/roadmap" className="active">Season Roadmap</Link>
        </nav>
        <Link href="/workspace" className="roadmapWorkspaceBtn">Open Workspace</Link>
      </header>

      <section className="roadmapHero">
        <div>
          <span className="roadmapEyebrow">CLUB OPERATIONS</span>
          <h1>Give every coach a clear path through the season.</h1>
          <p>
            One roadmap for forms, ordering, tournament decisions, documents, meetings,
            deadlines, and the resources coaches need from preseason through postseason.
          </p>
          <div className="roadmapViewToggle">
            <button className={view==='coach'?'active':''} onClick={()=>setView('coach')}>Coach View</button>
            <button className={view==='director'?'active':''} onClick={()=>setView('director')}>Director View</button>
          </div>
        </div>

        <aside className="roadmapProgressCard">
          <span>REQUIRED ITEMS</span>
          <strong>{requiredDone}/{required.length}</strong>
          <div className="roadmapProgressTrack"><i style={{width:`${progress}%`}} /></div>
          <p>{progress}% complete</p>
        </aside>
      </section>

      <section className="roadmapToolbar">
        <div className="phaseTabs">
          {['All', ...PHASES].map(phase => (
            <button key={phase} className={phaseFilter===phase?'active':''} onClick={()=>setPhaseFilter(phase)}>{phase}</button>
          ))}
        </div>
        {view === 'director' && <button className="addRoadmapBtn" onClick={()=>setShowAdd(true)}>+ Add Resource</button>}
      </section>

      <section className="roadmapIntroStrip">
        <div><b>{resources.length}</b><span>Total resources</span></div>
        <div><b>{resources.filter(r=>r.type==='Form').length}</b><span>Forms</span></div>
        <div><b>{required.length}</b><span>Required</span></div>
        <div><b>{doneCount}</b><span>Completed</span></div>
      </section>

      <section className="roadmapTimeline">
        {PHASES.filter(phase => phaseFilter === 'All' || phase === phaseFilter).map((phase, phaseIndex) => {
          const items = visible.filter(r => r.phase === phase);
          if (!items.length) return null;
          return (
            <section className="roadmapPhase" key={phase}>
              <div className="phaseMarker">
                <span>{String(phaseIndex + 1).padStart(2,'0')}</span>
                <i />
              </div>
              <div className="phaseContent">
                <header>
                  <div>
                    <small>SEASON PHASE</small>
                    <h2>{phase}</h2>
                  </div>
                  <span>{items.length} {items.length===1?'resource':'resources'}</span>
                </header>

                <div className="roadmapCards">
                  {items.map(item => {
                    const done = Boolean(completed[item.id]);
                    return (
                      <article key={item.id} className={`roadmapResource ${done?'done':''}`}>
                        <div className="resourceTop">
                          <span className={`resourceType type-${item.type.toLowerCase()}`}>{item.type}</span>
                          {item.required && <span className="requiredTag">Required</span>}
                          {view === 'director' && <button className="resourceDelete" onClick={()=>removeResource(item.id)} title="Remove resource">×</button>}
                        </div>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                        <div className="resourceMeta">
                          <div><small>DUE</small><b>{item.due || 'No deadline set'}</b></div>
                          <div><small>FOR</small><b>{item.audience}</b></div>
                        </div>
                        <footer>
                          <button className={`completeBtn ${done?'done':''}`} onClick={()=>toggleComplete(item.id)}>
                            {done ? '✓ Complete' : 'Mark complete'}
                          </button>
                          {item.url
                            ? <a href={item.url} target="_blank" rel="noreferrer">Open {item.type} →</a>
                            : <span className="linkPending">{view==='director' ? 'Add a link when ready' : 'Resource link coming soon'}</span>}
                        </footer>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}
      </section>

      <section className="roadmapFooterCta">
        <div>
          <span>FROM OPERATIONS TO COACHING</span>
          <h2>Finish the admin work. Then build the practice.</h2>
          <p>The Season Roadmap keeps program logistics organized; the Workspace keeps coaching knowledge organized.</p>
        </div>
        <Link href="/workspace">Open CoachVault Workspace →</Link>
      </section>

      {showAdd && (
        <div className="roadmapModal" onClick={()=>setShowAdd(false)}>
          <form onSubmit={addResource} onClick={e=>e.stopPropagation()}>
            <header>
              <div><small>DIRECTOR TOOL</small><h2>Add roadmap resource</h2></div>
              <button type="button" onClick={()=>setShowAdd(false)}>×</button>
            </header>
            <div className="roadmapFormGrid">
              <label><span>Title</span><input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="e.g. Helmet Order Form" required /></label>
              <label><span>Season phase</span><select value={draft.phase} onChange={e=>setDraft({...draft,phase:e.target.value})}>{PHASES.map(x=><option key={x}>{x}</option>)}</select></label>
              <label><span>Resource type</span><select value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value})}>{TYPES.map(x=><option key={x}>{x}</option>)}</select></label>
              <label><span>Due / timing</span><input value={draft.due} onChange={e=>setDraft({...draft,due:e.target.value})} placeholder="e.g. August 15" /></label>
              <label><span>Audience</span><input value={draft.audience} onChange={e=>setDraft({...draft,audience:e.target.value})} placeholder="Head coaches" /></label>
              <label><span>URL</span><input value={draft.url} onChange={e=>setDraft({...draft,url:e.target.value})} placeholder="Google Form, Drive doc, website..." /></label>
              <label className="full"><span>Description</span><textarea value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} placeholder="What does the coach need to do or know?" /></label>
              <label className="requiredCheck full"><input type="checkbox" checked={draft.required} onChange={e=>setDraft({...draft,required:e.target.checked})} /><span>Required item</span></label>
            </div>
            <footer><button type="button" onClick={()=>setShowAdd(false)}>Cancel</button><button className="saveResourceBtn" type="submit">Add to Roadmap</button></footer>
          </form>
        </div>
      )}
    </main>
  );
}
