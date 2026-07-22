'use client';

import { useEffect, useMemo, useState } from 'react';

const seedResources = [
  {
    id: 101,
    type: 'Practice Plan',
    title: '1-4-1 Ball Movement Progression',
    description: 'A layered offensive practice that builds passing rhythm, off-ball movement, and fast decisions.',
    meta: '90 min · Boys 2032',
    team: 'Boys 2032',
    collection: 'Practices',
    tags: ['Offense', 'Ball movement', 'Decision making'],
    updated: 'Today',
    favorite: true,
    viewed: 12,
    sections: [
      ['0–12 min', 'Dynamic warm-up + partner passing'],
      ['12–30 min', 'Three-man quick-stick progression'],
      ['30–50 min', '1-4-1 adjacent movement teaching'],
      ['50–72 min', '4v4 decision game with two-pass rule'],
      ['72–90 min', '6v6 guided play + competitive finish']
    ]
  },
  {
    id: 102,
    type: 'Drill',
    title: 'Ground Ball Advantage Drill',
    description: 'A competitive small-sided drill that teaches approach angles, communication, and the first pass.',
    meta: '12 min · 9–18 athletes',
    team: 'All Teams',
    collection: 'Drill Library',
    tags: ['Ground balls', 'Compete', 'Transition'],
    updated: 'Yesterday',
    favorite: true,
    viewed: 18,
    sections: [
      ['Setup', 'Three lines, one live ball, coach points the release direction.'],
      ['Constraint', 'Winning player must move the ball within two seconds.'],
      ['Coaching point', 'Run through the ball and communicate before possession.']
    ]
  },
  {
    id: 103,
    type: 'Team Message',
    title: 'Building a We > Me Culture',
    description: 'A short team talk about effort, body language, and being the teammate everyone can trust.',
    meta: 'Leadership · 4 min read',
    team: 'Boys 2032',
    collection: 'Culture',
    tags: ['Culture', 'Accountability', 'Leadership'],
    updated: 'Jul 20',
    favorite: false,
    viewed: 9,
    sections: [
      ['Opening', 'Talent may get attention, but trust is what keeps a team together.'],
      ['Challenge', 'Choose one action today that makes a teammate better.'],
      ['Close', 'We over me is not a slogan. It is what we repeatedly do.']
    ]
  },
  {
    id: 104,
    type: 'Evaluation',
    title: 'Tryout Evaluation Framework',
    description: 'A balanced rubric for athleticism, skill, decision-making, effort, coachability, and team fit.',
    meta: '18 athletes · 6 categories',
    team: 'Boys 2035/36',
    collection: 'Evaluations',
    tags: ['Tryouts', 'Assessment', 'Coachability'],
    updated: 'Jul 18',
    favorite: false,
    viewed: 7,
    sections: [
      ['Skill', 'Passing, catching, shooting, ground balls, weak hand.'],
      ['Athleticism', 'Acceleration, balance, change of direction, stamina.'],
      ['Intangibles', 'Effort, communication, response to coaching, teammate habits.']
    ]
  },
  {
    id: 105,
    type: 'Practice Plan',
    title: 'Defensive Footwork and Recovery',
    description: 'A progression from approach footwork to recovering inside and communicating the next slide.',
    meta: '75 min · U12',
    team: 'Boys 2035/36',
    collection: 'Practices',
    tags: ['Defense', 'Footwork', 'Communication'],
    updated: 'Jul 16',
    favorite: false,
    viewed: 11,
    sections: [
      ['Warm-up', 'Mirror footwork and hip turn progression.'],
      ['Skill', 'Approach, breakdown, drop step, recover.'],
      ['Team', '4v4 shell with adjacent slide calls.']
    ]
  },
  {
    id: 106,
    type: 'Drill',
    title: 'Three-Man Quick-Stick Passing',
    description: 'A tempo drill for hands, feet, communication, and moving the ball before pressure arrives.',
    meta: '10 min · 6–18 athletes',
    team: 'All Teams',
    collection: 'Drill Library',
    tags: ['Passing', 'Tempo', 'Warm-up'],
    updated: 'Jul 14',
    favorite: true,
    viewed: 23,
    sections: [
      ['Round 1', 'Stationary quick sticks, both hands.'],
      ['Round 2', 'Follow your pass with feet moving.'],
      ['Round 3', 'Add a defender and two-second decision rule.']
    ]
  },
  {
    id: 107,
    type: 'Parent Communication',
    title: 'Attendance and Commitment Reminder',
    description: 'A firm but constructive parent note explaining how attendance affects development and team planning.',
    meta: 'Parent email · 3 min read',
    team: 'Boys 2032',
    collection: 'Communication',
    tags: ['Parents', 'Attendance', 'Expectations'],
    updated: 'Jul 11',
    favorite: false,
    viewed: 6,
    sections: [
      ['Purpose', 'Clarify expectations without shaming families.'],
      ['Key point', 'Reliable attendance helps coaches plan and helps teammates improve.'],
      ['Close', 'Ask families to communicate conflicts as early as possible.']
    ]
  },
  {
    id: 108,
    type: 'Season Plan',
    title: '2032 Fall Development Map',
    description: 'Eight-week sequence covering stick skills, transition, clearing, team offense, and competitive habits.',
    meta: '8 weeks · Fall 2026',
    team: 'Boys 2032',
    collection: 'Season Plans',
    tags: ['Season planning', 'Development', 'Fall'],
    updated: 'Jul 8',
    favorite: true,
    viewed: 15,
    sections: [
      ['Weeks 1–2', 'Stick skills and playing fast.'],
      ['Weeks 3–4', 'Transition decisions and clearing.'],
      ['Weeks 5–6', 'Team offense and defensive communication.'],
      ['Weeks 7–8', 'Special situations and competition.']
    ]
  }
];

const navItems = ['Dashboard', 'Vault', 'AI Builder', 'Season Planner', 'Teams'];
const filterTypes = ['All', 'Practice Plan', 'Drill', 'Team Message', 'Evaluation', 'Parent Communication', 'Season Plan'];
const collectionOptions = ['All Collections', 'Practices', 'Drill Library', 'Culture', 'Evaluations', 'Communication', 'Season Plans'];

export default function Home() {
  const [active, setActive] = useState('Dashboard');
  const [resources, setResources] = useState(seedResources);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [collection, setCollection] = useState('All Collections');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState('Recently updated');
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [prompt, setPrompt] = useState('Build a 90-minute practice for 17 players and 2 goalies focused on faster ball movement and clearing decisions.');
  const [generated, setGenerated] = useState('');

  useEffect(() => {
    const saved = window.localStorage.getItem('coachvault-v03-resources');
    if (saved) {
      try { setResources(JSON.parse(saved)); } catch (_) {}
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('coachvault-v03-resources', JSON.stringify(resources));
  }, [resources]);

  const visibleResources = useMemo(() => {
    const lower = search.trim().toLowerCase();
    const filtered = resources.filter((item) => {
      const typeMatch = filter === 'All' || item.type === filter;
      const collectionMatch = collection === 'All Collections' || item.collection === collection;
      const favoriteMatch = !favoritesOnly || item.favorite;
      const haystack = `${item.title} ${item.description} ${item.meta} ${item.team} ${item.collection} ${item.tags.join(' ')}`.toLowerCase();
      return typeMatch && collectionMatch && favoriteMatch && haystack.includes(lower);
    });
    return [...filtered].sort((a, b) => {
      if (sort === 'Most viewed') return b.viewed - a.viewed;
      if (sort === 'Title A–Z') return a.title.localeCompare(b.title);
      return b.id - a.id;
    });
  }, [resources, search, filter, collection, favoritesOnly, sort]);

  function toggleFavorite(id) {
    setResources((current) => current.map((item) => item.id === id ? { ...item, favorite: !item.favorite } : item));
    setSelected((current) => current?.id === id ? { ...current, favorite: !current.favorite } : current);
  }

  function openResource(item) {
    const updated = { ...item, viewed: item.viewed + 1 };
    setResources((current) => current.map((resource) => resource.id === item.id ? updated : resource));
    setSelected(updated);
  }

  function addResource(form) {
    const data = new FormData(form);
    const newResource = {
      id: Date.now(),
      type: data.get('type'),
      title: data.get('title'),
      description: data.get('description') || 'New coaching resource.',
      meta: data.get('meta') || 'New resource',
      team: data.get('team') || 'All Teams',
      collection: data.get('collection') || 'Practices',
      tags: String(data.get('tags') || '').split(',').map((tag) => tag.trim()).filter(Boolean),
      updated: 'Just now',
      favorite: false,
      viewed: 0,
      sections: [['Coaching notes', data.get('notes') || 'Add your coaching details here.']]
    };
    setResources((current) => [newResource, ...current]);
    setShowCreate(false);
    setActive('Vault');
  }

  function buildPractice() {
    const focus = prompt.trim() || 'team development';
    setGenerated(`PRACTICE OBJECTIVE\n${focus}\n\n0–10 MIN · ARRIVAL + STICKWORK\nDynamic movement, partner passing, both hands, finish each rep with communication.\n\n10–25 MIN · FUNDAMENTAL PROGRESSION\nThree-player passing groups. Add movement, then pressure, then a two-second decision rule.\n\n25–45 MIN · TEACHING STATIONS\nStation 1: clearing decisions\nStation 2: off-ball spacing\nStation 3: goalie outlets and first pass\n\n45–65 MIN · SMALL-SIDED COMPETITION\n4v4 continuous transition. Offense earns two points for a goal after three passes; defense earns one point for a clean clear.\n\n65–82 MIN · GUIDED TEAM PLAY\n6v6 with freeze-and-correct coaching. Emphasize early communication and moving the ball before pressure arrives.\n\n82–90 MIN · COMPETITIVE FINISH + RECAP\nShort game to three. Close with one player takeaway and one team standard for the next practice.`);
  }

  return (
    <main className="appShell">
      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <button className="brand" onClick={() => { setActive('Dashboard'); setMobileNav(false); }}>
          <span className="brandMark">CV</span>
          <span><b>CoachVault</b><small>Coaching knowledge system</small></span>
        </button>
        <nav>
          {navItems.map((item) => (
            <button key={item} className={active === item ? 'active' : ''} onClick={() => { setActive(item); setMobileNav(false); }}>
              <span>{navIcon(item)}</span>{item}
            </button>
          ))}
        </nav>
        <div className="sidebarInsight">
          <span className="kicker light">COACH AI</span>
          <strong>Your next practice is one prompt away.</strong>
          <button onClick={() => setActive('AI Builder')}>Open builder <span>→</span></button>
        </div>
        <div className="profile">
          <div className="avatar">JB</div>
          <div><b>Jordan Bird</b><span>Club Director</span></div>
          <button aria-label="Profile menu">•••</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="menuButton" onClick={() => setMobileNav(!mobileNav)}>☰</button>
          <div>
            <span className="kicker">COACHING COMMAND CENTER</span>
            <h1>{active}</h1>
          </div>
          <div className="topActions">
            <button className="iconButton" title="Search" onClick={() => setActive('Vault')}>⌕</button>
            <button className="primaryButton" onClick={() => setShowCreate(true)}>＋ New resource</button>
          </div>
        </header>

        {active === 'Dashboard' && <Dashboard resources={resources} setActive={setActive} openResource={openResource} />}
        {active === 'Vault' && <Vault resources={visibleResources} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} collection={collection} setCollection={setCollection} favoritesOnly={favoritesOnly} setFavoritesOnly={setFavoritesOnly} sort={sort} setSort={setSort} openResource={openResource} toggleFavorite={toggleFavorite} />}
        {active === 'AI Builder' && <AIBuilder prompt={prompt} setPrompt={setPrompt} generated={generated} buildPractice={buildPractice} />}
        {active === 'Season Planner' && <SeasonPlanner />}
        {active === 'Teams' && <Teams />}
      </section>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={addResource} />}
      {selected && <ResourceModal resource={selected} onClose={() => setSelected(null)} toggleFavorite={toggleFavorite} />}
    </main>
  );
}

function Dashboard({ resources, setActive, openResource }) {
  const recent = [...resources].sort((a, b) => b.id - a.id).slice(0, 4);
  return (
    <>
      <section className="welcomeGrid">
        <article className="welcomeCard">
          <div>
            <span className="kicker light">GOOD MORNING, JORDAN</span>
            <h2>Build the practice.<br/>Keep the knowledge.</h2>
            <p>CoachVault gives your drills, plans, messages, and ideas one organized home—so your best coaching does not disappear into old notes.</p>
            <div className="buttonRow">
              <button className="accentButton" onClick={() => setActive('Vault')}>Open your Vault</button>
              <button className="ghostButton lightGhost" onClick={() => setActive('AI Builder')}>Build with AI</button>
            </div>
          </div>
          <div className="orbit"><span>CV</span><i></i><b></b></div>
        </article>
        <article className="nextPractice">
          <div className="cardTop"><span className="kicker">NEXT PRACTICE</span><button>•••</button></div>
          <div className="dateBadge"><b>23</b><span>JUL</span></div>
          <h3>Boys 2032</h3>
          <p>Wednesday · 6:00–7:30 PM</p>
          <div className="focusBox"><span>PRIMARY FOCUS</span><b>Ride, clear, and first-pass decisions</b></div>
          <div className="attendance"><span><b>17</b> attending</span><span><b>2</b> goalies</span></div>
          <button className="fullButton">Open practice plan →</button>
        </article>
      </section>

      <section className="metricGrid">
        <Metric icon="▣" label="Saved resources" value={resources.length + 110} note="Across 7 collections" />
        <Metric icon="✦" label="Practice plans" value="24" note="7 created this month" />
        <Metric icon="◎" label="Teams supported" value="4" note="Current season" />
        <Metric icon="◷" label="Time saved" value="18.5h" note="Estimated this month" />
      </section>

      <section className="sectionHeader">
        <div><span className="kicker">RECENT WORK</span><h2>Pick up where you left off</h2></div>
        <button onClick={() => setActive('Vault')}>View all resources →</button>
      </section>
      <section className="resourceGrid four">
        {recent.map((item) => <ResourceCard key={item.id} item={item} onOpen={() => openResource(item)} compact />)}
      </section>

      <section className="dashboardBottom">
        <article className="aiPromptCard">
          <div className="spark">✦</div>
          <div><span className="kicker light">COACHVAULT AI</span><h2>What are you building today?</h2><p>Describe the age, roster size, available time, and your coaching goal. CoachVault turns it into a practical starting point.</p></div>
          <button className="accentButton" onClick={() => setActive('AI Builder')}>Start building</button>
        </article>
        <article className="coachFocus">
          <div className="cardTop"><span className="kicker">THIS WEEK'S FOCUS</span><button>•••</button></div>
          <h3>Play faster without playing rushed.</h3>
          <p>Use constraints that reward early communication, quick outlets, and one-more passes.</p>
          <div className="progress"><span style={{width:'68%'}}></span></div>
          <small>3 of 5 planned sessions complete</small>
        </article>
      </section>
    </>
  );
}

function Vault({ resources, search, setSearch, filter, setFilter, collection, setCollection, favoritesOnly, setFavoritesOnly, sort, setSort, openResource, toggleFavorite }) {
  return (
    <>
      <section className="pageIntro splitIntro">
        <div><span className="kicker">YOUR COACHING MEMORY</span><h2>Everything worth keeping.<br/>Easy to find again.</h2><p>Search across practices, drills, messages, evaluations, and season plans. Add structure now so your best ideas remain useful later.</p></div>
        <div className="vaultSummary"><strong>{resources.length}</strong><span>resources shown</span><small>Filters update instantly</small></div>
      </section>

      <section className="vaultToolbar">
        <div className="searchBox"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title, tag, team, topic…" /></div>
        <select value={collection} onChange={(e) => setCollection(e.target.value)}>{collectionOptions.map((item) => <option key={item}>{item}</option>)}</select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}><option>Recently updated</option><option>Most viewed</option><option>Title A–Z</option></select>
      </section>

      <section className="filterBar">
        <div className="chipRow">
          {filterTypes.map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}
        </div>
        <button className={`favoriteFilter ${favoritesOnly ? 'active' : ''}`} onClick={() => setFavoritesOnly(!favoritesOnly)}>★ Favorites</button>
      </section>

      {resources.length > 0 ? (
        <section className="resourceGrid three">
          {resources.map((item) => <ResourceCard key={item.id} item={item} onOpen={() => openResource(item)} onFavorite={() => toggleFavorite(item.id)} />)}
        </section>
      ) : (
        <div className="emptyState"><div>⌕</div><h3>No matching resources</h3><p>Try clearing a filter or searching with fewer words.</p></div>
      )}
    </>
  );
}

function AIBuilder({ prompt, setPrompt, generated, buildPractice }) {
  return (
    <section className="builderLayout">
      <article className="builderForm">
        <span className="kicker">COACHVAULT AI</span>
        <h2>Turn a rough idea into a usable practice.</h2>
        <p>Give CoachVault the real-world details: team age, number of players, goalies, time, current problem, and desired emphasis.</p>
        <label>Describe the practice you need</label>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <div className="suggestions">
          <button onClick={() => setPrompt('Create a 75-minute U10 practice for 14 players focused on ground balls, confidence, and fun competition.')}>U10 confidence</button>
          <button onClick={() => setPrompt('Build a 90-minute practice for 17 players and 2 goalies focused on clearing against pressure.')}>Clear vs. pressure</button>
          <button onClick={() => setPrompt('Create a 60-minute indoor practice with limited space focused on stick skills and fast decisions.')}>Indoor session</button>
        </div>
        <button className="primaryButton full" onClick={buildPractice}>✦ Generate practice plan</button>
      </article>
      <article className="generatedPanel">
        <div className="generatedTop"><span className="kicker">GENERATED PLAN</span>{generated && <button onClick={() => navigator.clipboard?.writeText(generated)}>Copy</button>}</div>
        {generated ? <pre>{generated}</pre> : <div className="generatedEmpty"><span>✦</span><h3>Your plan will appear here</h3><p>CoachVault will organize the session into timed blocks with practical coaching points.</p></div>}
      </article>
    </section>
  );
}

function SeasonPlanner() {
  const weeks = [
    ['Week 1', 'Identity + fundamentals', 'Build standards, assess stick skills, establish tempo.', '2 practices'],
    ['Week 2', 'Ball movement + spacing', 'Move the defense before attacking it.', '2 practices · 1 game'],
    ['Week 3', 'Transition decisions', 'First pass, lanes, communication, and substitution habits.', '2 practices'],
    ['Week 4', 'Ride + clear', 'Create repeatable roles under pressure.', '2 practices · tournament'],
    ['Week 5', 'Team defense', 'Approach, recover, adjacent slides, and crease communication.', '2 practices'],
  ];
  return (
    <>
      <section className="pageIntro"><span className="kicker">SPRING 2027</span><h2>Plan development—not just dates.</h2><p>Give every week a purpose, connect practices to season goals, and make progression visible to your staff.</p></section>
      <section className="seasonHeader"><div><b>SC Select Boys 2032</b><span>5-week view</span></div><button className="primaryButton">＋ Add week</button></section>
      <div className="timeline">
        {weeks.map(([week, title, description, load], index) => (
          <article className="timelineItem" key={week}>
            <div className="timelineNode"><span>{index + 1}</span></div>
            <div className="timelineContent"><span className="kicker">{week}</span><h3>{title}</h3><p>{description}</p><small>{load}</small></div>
            <button>Open week →</button>
          </article>
        ))}
      </div>
    </>
  );
}

function Teams() {
  const teams = [
    ['Boys 2032', '17 athletes', 'Spring 2027', 'Next: Wed 6:00 PM'],
    ['Boys 2035/36', '21 athletes', 'Spring 2027', 'Next: Thu 5:45 PM'],
    ['Girls 2034', '18 athletes', 'Spring 2027', 'Next: Sun 4:00 PM'],
    ['Mid-Maryland Sixes', '72 athletes', 'Fall 2026', 'Registration open']
  ];
  return (
    <>
      <section className="pageIntro"><span className="kicker">TEAM WORKSPACES</span><h2>One coaching system.<br/>Every team connected.</h2><p>Keep team-specific plans, people, priorities, and resources together without duplicating your entire coaching library.</p></section>
      <section className="teamGrid">
        {teams.map(([name, count, season, next], index) => (
          <article className="teamCard" key={name}>
            <div className={`teamBadge badge${index + 1}`}>CV</div>
            <div className="teamMeta"><span className="kicker">{season}</span><h3>{name}</h3><p>{count}</p><small>{next}</small></div>
            <button>Manage team →</button>
          </article>
        ))}
      </section>
    </>
  );
}

function Metric({ icon, label, value, note }) {
  return <article className="metric"><span className="metricIcon">{icon}</span><div><small>{label}</small><strong>{value}</strong><p>{note}</p></div></article>;
}

function ResourceCard({ item, onOpen, onFavorite, compact = false }) {
  return (
    <article className={`resourceCard ${compact ? 'compact' : ''}`}>
      <div className="resourceTop"><span className={`typePill type-${slug(item.type)}`}>{item.type}</span>{onFavorite ? <button className={`star ${item.favorite ? 'on' : ''}`} onClick={onFavorite}>★</button> : <span className="updated">{item.updated}</span>}</div>
      <button className="resourceBody" onClick={onOpen}>
        <h3>{item.title}</h3>
        {!compact && <p>{item.description}</p>}
        <span className="metaLine">{item.meta} · {item.team}</span>
        <div className="tagRow">{item.tags.slice(0, compact ? 2 : 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
        <div className="resourceFooter"><small>{item.collection}</small><b>Open →</b></div>
      </button>
    </article>
  );
}

function CreateModal({ onClose, onCreate }) {
  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="modalClose" onClick={onClose}>×</button>
        <span className="kicker">NEW RESOURCE</span>
        <h2>Save something worth reusing.</h2>
        <form onSubmit={(e) => { e.preventDefault(); onCreate(e.currentTarget); }}>
          <div className="formGrid two">
            <label>Type<select name="type">{filterTypes.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Collection<select name="collection">{collectionOptions.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <label>Title<input name="title" required placeholder="Example: Clearing Against Pressure" /></label>
          <label>Short description<textarea name="description" placeholder="What makes this resource useful?" /></label>
          <div className="formGrid two">
            <label>Team<input name="team" placeholder="Boys 2032" /></label>
            <label>Details<input name="meta" placeholder="90 min · 17 athletes" /></label>
          </div>
          <label>Tags<input name="tags" placeholder="Clearing, communication, transition" /></label>
          <label>Coaching notes<textarea name="notes" placeholder="Add the first useful note or instruction." /></label>
          <button className="primaryButton full" type="submit">Save to Vault</button>
        </form>
      </div>
    </div>
  );
}

function ResourceModal({ resource, onClose, toggleFavorite }) {
  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal resourceModal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="modalClose" onClick={onClose}>×</button>
        <div className="detailHeader">
          <div><span className={`typePill type-${slug(resource.type)}`}>{resource.type}</span><h2>{resource.title}</h2><p>{resource.description}</p></div>
          <button className={`favoriteButton ${resource.favorite ? 'active' : ''}`} onClick={() => toggleFavorite(resource.id)}>★ {resource.favorite ? 'Favorited' : 'Favorite'}</button>
        </div>
        <div className="detailMeta">
          <span><small>TEAM</small><b>{resource.team}</b></span>
          <span><small>DETAILS</small><b>{resource.meta}</b></span>
          <span><small>COLLECTION</small><b>{resource.collection}</b></span>
          <span><small>VIEWS</small><b>{resource.viewed}</b></span>
        </div>
        <div className="detailTags">{resource.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        <section className="notesSection"><div className="sectionHeader small"><div><span className="kicker">RESOURCE DETAILS</span><h2>Coaching notes</h2></div><button>Edit</button></div>
          <div className="noteList">{resource.sections.map(([title, text]) => <article key={title}><b>{title}</b><p>{text}</p></article>)}</div>
        </section>
      </div>
    </div>
  );
}

function navIcon(item) {
  return ({ Dashboard: '⌂', Vault: '▦', 'AI Builder': '✦', 'Season Planner': '▤', Teams: '◎' })[item];
}
function slug(value) { return value.toLowerCase().replaceAll(' ', '-'); }
