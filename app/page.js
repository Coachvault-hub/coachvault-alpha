'use client';

import { useEffect, useMemo, useState } from 'react';

const starterResources = [
  { id: 1, type: 'Practice Plan', title: '1-4-1 Ball Movement Progression', meta: '75 min · Boys 2032', tags: ['Offense', 'Ball movement'], updated: 'Today' },
  { id: 2, type: 'Evaluation', title: 'Tryout Evaluation Framework', meta: '18 athletes · 6 categories', tags: ['Tryouts', 'Assessment'], updated: 'Yesterday' },
  { id: 3, type: 'Team Message', title: 'Building a We > Me Culture', meta: 'Leadership · Culture', tags: ['Culture', 'Accountability'], updated: 'Jul 18' },
  { id: 4, type: 'Drill', title: 'Three-Man Quick-Stick Passing', meta: '12 min · 9–18 athletes', tags: ['Passing', 'Tempo'], updated: 'Jul 16' },
  { id: 5, type: 'Practice Plan', title: 'Defensive Footwork and Recovery', meta: '90 min · U12', tags: ['Defense', 'Footwork'], updated: 'Jul 14' },
  { id: 6, type: 'Drill', title: 'Ground Ball Advantage Drill', meta: '10 min · Small groups', tags: ['Ground balls', 'Compete'], updated: 'Jul 12' },
];

const navItems = ['Dashboard', 'Vault', 'AI Builder', 'Season Planner', 'Teams'];
const types = ['All', 'Practice Plan', 'Drill', 'Team Message', 'Evaluation'];

export default function Home() {
  const [active, setActive] = useState('Dashboard');
  const [resources, setResources] = useState(starterResources);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('Create a 90-minute practice for 17 players focused on faster ball movement.');
  const [generated, setGenerated] = useState('');

  useEffect(() => {
    const saved = window.localStorage.getItem('coachvault-resources');
    if (saved) setResources(JSON.parse(saved));
  }, []);

  useEffect(() => {
    window.localStorage.setItem('coachvault-resources', JSON.stringify(resources));
  }, [resources]);

  const visibleResources = useMemo(() => {
    return resources.filter((item) => {
      const typeMatch = filter === 'All' || item.type === filter;
      const haystack = `${item.title} ${item.meta} ${item.tags.join(' ')}`.toLowerCase();
      return typeMatch && haystack.includes(search.toLowerCase());
    });
  }, [resources, search, filter]);

  function addResource(form) {
    const data = new FormData(form);
    const newResource = {
      id: Date.now(),
      type: data.get('type'),
      title: data.get('title'),
      meta: data.get('meta') || 'New resource',
      tags: String(data.get('tags') || '').split(',').map((tag) => tag.trim()).filter(Boolean),
      updated: 'Just now'
    };
    setResources((current) => [newResource, ...current]);
    setShowCreate(false);
    setActive('Vault');
  }

  function buildPractice() {
    const focus = aiPrompt.trim() || 'a complete team practice';
    setGenerated(`90-MINUTE PRACTICE\n\n0–10: Dynamic warm-up and stickwork\n10–25: Skill progression tied to ${focus}\n25–45: Small-group teaching stations\n45–65: Advantage/disadvantage competition\n65–82: Guided team play with coaching constraints\n82–90: Competitive finish, recap, and player takeaway`);
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setActive('Dashboard')}><span>CV</span><b>CoachVault</b></button>
        <nav>
          {navItems.map((item) => (
            <button key={item} className={active === item ? 'active' : ''} onClick={() => setActive(item)}>{item}</button>
          ))}
        </nav>
        <div className="sidebarCard">
          <small>COACHVAULT AI</small>
          <strong>Turn rough notes into a full practice.</strong>
          <button onClick={() => setActive('AI Builder')}>Try the Builder →</button>
        </div>
        <div className="profile"><div className="avatar">JB</div><div><b>Jordan Bird</b><span>Club Director</span></div></div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div><span className="eyebrow">COACHING COMMAND CENTER</span><h1>{active}</h1></div>
          <button className="primary" onClick={() => setShowCreate(true)}>＋ Create</button>
        </header>

        {active === 'Dashboard' && <Dashboard setActive={setActive} resources={resources} setSelected={setSelected} />}
        {active === 'Vault' && <Vault resources={visibleResources} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} setSelected={setSelected} />}
        {active === 'AI Builder' && <AIBuilder prompt={aiPrompt} setPrompt={setAiPrompt} generated={generated} buildPractice={buildPractice} />}
        {active === 'Season Planner' && <SeasonPlanner />}
        {active === 'Teams' && <Teams />}
      </section>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={addResource} />}
      {selected && <ResourceModal resource={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}

function Dashboard({ setActive, resources, setSelected }) {
  return <>
    <section className="hero">
      <div><span className="eyebrow">YOUR COACHING COMMAND CENTER</span><h2>Good afternoon, Jordan.</h2><p>Capture what works, build better practices, and keep your entire coaching system in one place.</p><div className="actions"><button className="primary" onClick={() => setActive('Vault')}>Open your Vault</button><button className="secondary" onClick={() => setActive('AI Builder')}>Build with AI</button></div></div>
      <div className="heroMark">CV</div>
    </section>
    <section className="stats">
      <Stat label="Saved resources" value={resources.length + 110} note="Across 5 collections" />
      <Stat label="Practice plans" value="24" note="7 created this month" />
      <Stat label="Teams supported" value="4" note="Spring 2027 season" />
      <Stat label="Time saved" value="18.5h" note="Estimated this month" />
    </section>
    <section className="sectionHead"><div><span className="eyebrow">RECENT WORK</span><h2>Pick up where you left off</h2></div><button className="textButton" onClick={() => setActive('Vault')}>View all →</button></section>
    <section className="cards three">
      {resources.slice(0,3).map((item) => <ResourceCard key={item.id} item={item} onClick={() => setSelected(item)} />)}
    </section>
    <section className="aiBanner"><div><span className="eyebrow">COACHVAULT AI</span><h2>What are you building today?</h2><p>Describe your team, age group, goals, and time available. CoachVault turns it into a usable plan.</p></div><button className="primary light" onClick={() => setActive('AI Builder')}>Start building</button></section>
  </>;
}

function Vault({ resources, search, setSearch, filter, setFilter, setSelected }) {
  return <>
    <section className="pageIntro"><span className="eyebrow">YOUR VAULT</span><h2>Everything worth keeping, easy to find.</h2><p>Search, filter, and open the resources you use to lead your teams.</p></section>
    <section className="toolbar"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search drills, plans, messages…" /><div className="filters">{types.map((type) => <button key={type} className={filter === type ? 'active' : ''} onClick={() => setFilter(type)}>{type}</button>)}</div></section>
    <section className="cards three">{resources.map((item) => <ResourceCard key={item.id} item={item} onClick={() => setSelected(item)} />)}</section>
    {resources.length === 0 && <div className="empty"><h3>No resources found</h3><p>Try a different search or filter.</p></div>}
  </>;
}

function AIBuilder({ prompt, setPrompt, generated, buildPractice }) {
  return <section className="builderGrid"><div className="builderPanel"><span className="eyebrow">COACHVAULT AI</span><h2>Build a better practice in minutes.</h2><p>Describe the team, time, and coaching goal. This prototype creates a structured starting point.</p><label>What do you need?</label><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} /><div className="promptChips"><button onClick={() => setPrompt('Create a 75-minute U10 practice focused on ground balls and confidence.')}>U10 ground balls</button><button onClick={() => setPrompt('Build a 90-minute practice for 17 players focused on faster ball movement.')}>Fast ball movement</button></div><button className="primary wide" onClick={buildPractice}>Generate practice</button></div><div className="resultPanel"><span className="eyebrow">GENERATED PLAN</span>{generated ? <pre>{generated}</pre> : <div className="placeholder"><div>✦</div><h3>Your practice will appear here</h3><p>Use a detailed prompt for a more useful plan.</p></div>}</div></section>;
}

function SeasonPlanner() {
  const weeks = [
    ['Week 1', 'Team identity + fundamentals', '2 practices'],
    ['Week 2', 'Ball movement + spacing', '2 practices · 1 game'],
    ['Week 3', 'Transition decisions', '2 practices'],
    ['Week 4', 'Special situations', '2 practices · tournament'],
  ];
  return <><section className="pageIntro"><span className="eyebrow">SPRING 2027</span><h2>Plan the season before it plans you.</h2><p>Organize weekly themes, practices, games, and developmental priorities.</p></section><div className="timeline">{weeks.map(([week, focus, load]) => <div className="week" key={week}><b>{week}</b><div><h3>{focus}</h3><p>{load}</p></div><button>Open →</button></div>)}</div></>;
}

function Teams() {
  const teams = [['Boys 2032','17 athletes','Spring 2027'],['Boys 2035/36','21 athletes','Spring 2027'],['Girls 2034','18 athletes','Spring 2027'],['Mid-Maryland Sixes','72 athletes','Fall 2026']];
  return <><section className="pageIntro"><span className="eyebrow">TEAMS</span><h2>One coaching system, every team.</h2><p>Keep rosters, seasons, and team-specific resources connected.</p></section><section className="cards two">{teams.map(([name,count,season]) => <article className="teamCard" key={name}><div className="teamIcon">CV</div><div><h3>{name}</h3><p>{count} · {season}</p></div><button>Manage →</button></article>)}</section></>;
}

function Stat({ label, value, note }) { return <article className="stat"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>; }
function ResourceCard({ item, onClick }) { return <button className="resourceCard" onClick={onClick}><div className="typeRow"><span>{item.type}</span><small>{item.updated}</small></div><h3>{item.title}</h3><p>{item.meta}</p><div className="tags">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><b>Open resource →</b></button>; }

function CreateModal({ onClose, onCreate }) {
  return <div className="modalBack" onMouseDown={onClose}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><button className="close" onClick={onClose}>×</button><span className="eyebrow">NEW RESOURCE</span><h2>Save something worth reusing.</h2><form onSubmit={(e) => {e.preventDefault(); onCreate(e.currentTarget);}}><label>Resource type<select name="type"><option>Practice Plan</option><option>Drill</option><option>Team Message</option><option>Evaluation</option></select></label><label>Title<input name="title" required placeholder="Example: Ground Ball Progression" /></label><label>Details<input name="meta" placeholder="Example: 15 min · 12 athletes" /></label><label>Tags<input name="tags" placeholder="Passing, tempo, offense" /></label><button className="primary wide" type="submit">Save to Vault</button></form></div></div>;
}
function ResourceModal({ resource, onClose }) { return <div className="modalBack" onMouseDown={onClose}><div className="modal resource" onMouseDown={(e) => e.stopPropagation()}><button className="close" onClick={onClose}>×</button><span className="eyebrow">{resource.type}</span><h2>{resource.title}</h2><p className="lead">{resource.meta}</p><div className="detailBlock"><h3>Coaching notes</h3><p>This is a functional prototype resource view. The next release can add editable steps, diagrams, attachments, and team assignments.</p></div><div className="tags">{resource.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div></div>; }
