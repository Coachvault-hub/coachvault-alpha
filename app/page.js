'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const starterResources = [
  {id:1,type:'Practice Plan',title:'1-4-1 Ball Movement Progression',description:'A 90-minute progression for passing rhythm, off-ball movement, and faster decisions.',team:'Private',tags:['Offense','Ball movement','U12'],favorite:true,status:'Private',updated:'Today'},
  {id:2,type:'Drill',title:'Ground Ball Advantage Drill',description:'Competitive small-sided work for approach angles, communication, and the first pass.',team:'2032 Boys',tags:['Ground balls','Compete','Transition'],favorite:true,status:'Published',updated:'Yesterday'},
  {id:3,type:'Team Talk',title:'Building a We > Me Culture',description:'A short message about effort, body language, and being a teammate others can trust.',team:'Private',tags:['Culture','Leadership'],favorite:false,status:'Private',updated:'Jul 20'},
  {id:4,type:'Drill',title:'Three-Man Quick-Stick Passing',description:'Tempo passing drill for hands, feet, communication, and decisions before pressure arrives.',team:'All Teams',tags:['Passing','Warm-up','Tempo'],favorite:true,status:'Published',updated:'Jul 18'},
  {id:5,type:'Document',title:'Fall Development Map',description:'Eight-week sequence covering stick skills, transition, clearing, and team concepts.',team:'Private',tags:['Season plan','Development'],favorite:false,status:'Private',updated:'Jul 16'}
];

const starterTeams = [
  {id:1,name:'2032 Boys',sport:'Lacrosse',players:19,inviteCode:'CV-2032',color:'blue'},
  {id:2,name:'2035/36 Boys',sport:'Lacrosse',players:17,inviteCode:'CV-3536',color:'green'}
];

const nav = ['Home','My Vault','Upload Center','Team Spaces'];

function inferCatalog(file, text='') {
  const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g,' ');
  const lower = `${name} ${text.slice(0,4000)}`.toLowerCase();
  let type = 'Document';
  if (/practice|warmup|minute|station/.test(lower)) type = 'Practice Plan';
  else if (/drill|repetition|reps|setup/.test(lower)) type = 'Drill';
  else if (/speech|message|culture|leadership/.test(lower)) type = 'Team Talk';
  else if (/evaluation|rubric|score/.test(lower)) type = 'Evaluation';
  else if (/video/.test(file.type) || /youtube|vimeo/.test(lower)) type = 'Video';

  const concepts = [
    ['Ground balls',/ground ball/],['Passing',/passing|quick stick/],['Clearing',/clear|outlet/],
    ['Defense',/defense|slide|approach/],['Offense',/offense|1-4-1|2-3-1/],['Culture',/culture|leadership|accountability/],
    ['Shooting',/shoot|finishing/],['Transition',/transition|fast break/],['Conditioning',/conditioning|sprint/]
  ].filter(([,re])=>re.test(lower)).map(([label])=>label);

  const ages = lower.match(/u\s?\d{1,2}|\d{4}|\d+(?:st|nd|rd|th) grade/i);
  return {
    title:name.replace(/\b\w/g,c=>c.toUpperCase()), type,
    description:`Imported ${file.type || 'file'} ready for coach review and cataloging.`,
    tags: concepts.length ? concepts : ['Imported'],
    ageGroup: ages ? ages[0].toUpperCase() : 'Not detected',
    confidence: text ? 88 : 72,
    sourceName:file.name,
    size:file.size,
    textExtracted:Boolean(text)
  };
}

export default function Home(){
  const [active,setActive]=useState('Home');
  const [resources,setResources]=useState(starterResources);
  const [teams,setTeams]=useState(starterTeams);
  const [search,setSearch]=useState('');
  const [typeFilter,setTypeFilter]=useState('All');
  const [selected,setSelected]=useState(null);
  const [publishTarget,setPublishTarget]=useState('2032 Boys');
  const [uploads,setUploads]=useState([]);
  const [processing,setProcessing]=useState(false);
  const [showCreateTeam,setShowCreateTeam]=useState(false);
  const [showInvite,setShowInvite]=useState(null);
  const inputRef=useRef(null);

  useEffect(()=>{
    try {
      const saved=localStorage.getItem('coachvault-v04');
      if(saved){const data=JSON.parse(saved); if(data.resources)setResources(data.resources); if(data.teams)setTeams(data.teams);}
    } catch(_){}
  },[]);
  useEffect(()=>{localStorage.setItem('coachvault-v04',JSON.stringify({resources,teams}));},[resources,teams]);

  const visible=useMemo(()=>resources.filter(r=>{
    const hay=`${r.title} ${r.description} ${r.type} ${r.tags.join(' ')}`.toLowerCase();
    return (typeFilter==='All'||r.type===typeFilter)&&hay.includes(search.toLowerCase());
  }),[resources,search,typeFilter]);

  async function handleFiles(fileList){
    const files=[...fileList]; if(!files.length)return;
    setProcessing(true);
    const results=[];
    for(const file of files){
      let text='';
      if(/text|json|csv|markdown/.test(file.type)||/\.(txt|md|csv|json)$/i.test(file.name)){
        try{text=await file.text();}catch(_){}
      }
      results.push({...inferCatalog(file,text),id:`upload-${Date.now()}-${Math.random()}`});
    }
    setUploads(curr=>[...results,...curr]); setProcessing(false);
  }

  function addUploadToVault(item){
    const resource={id:Date.now(),type:item.type,title:item.title,description:item.description,team:'Private',tags:[...item.tags,item.ageGroup].filter(x=>x&&x!=='Not detected'),favorite:false,status:'Private',updated:'Just now',sourceName:item.sourceName};
    setResources(curr=>[resource,...curr]);
    setUploads(curr=>curr.filter(x=>x.id!==item.id));
  }

  function publishResource(resource,target){
    setResources(curr=>curr.map(r=>r.id===resource.id?{...r,status:'Published',team:target,updated:'Just now'}:r));
    setSelected(null);
  }

  function addTeam(form){
    const data=new FormData(form);
    const name=String(data.get('name')||'New Team');
    setTeams(curr=>[...curr,{id:Date.now(),name,sport:String(data.get('sport')||'Lacrosse'),players:0,inviteCode:`CV-${Math.random().toString(36).slice(2,7).toUpperCase()}`,color:'purple'}]);
    setShowCreateTeam(false);
  }

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><div>CV</div><span><b>CoachVault</b><small>Know it. Teach it.</small></span></div>
      <nav>{nav.map(item=><button key={item} className={active===item?'active':''} onClick={()=>setActive(item)}><span>{item==='Home'?'⌂':item==='My Vault'?'▣':item==='Upload Center'?'⇧':'◎'}</span>{item}</button>)}</nav>
      <div className="sideNote"><b>Coach Brain</b><p>Your private coaching knowledge stays private until you choose to publish it.</p></div>
      <div className="profile"><div>JB</div><span><b>Jordan</b><small>Head Coach</small></span></div>
    </aside>

    <section className="workspace">
      <header className="topbar"><div><small>COACHVAULT 0.4</small><h1>{active}</h1></div><div className="topActions"><button className="ghost" onClick={()=>setActive('Upload Center')}>Upload</button><button className="primary" onClick={()=>setActive('My Vault')}>Open Vault</button></div></header>

      {active==='Home'&&<>
        <section className="hero"><div><span className="eyebrow">THE COACHING KNOWLEDGE PLATFORM</span><h2>Everything you know.<br/>Everything you choose to teach.</h2><p>Build your private Coach Brain, then publish the right drills, videos, and development work directly to your teams.</p><div className="heroButtons"><button className="primary" onClick={()=>setActive('Upload Center')}>Upload coaching material</button><button className="ghost light" onClick={()=>setActive('Team Spaces')}>View team spaces</button></div></div><div className="flow"><article><b>1</b><span><strong>Create or import</strong><small>Practice plans, drills, videos, documents</small></span></article><i>↓</i><article><b>2</b><span><strong>Catalog in My Vault</strong><small>Searchable, tagged, private knowledge</small></span></article><i>↓</i><article><b>3</b><span><strong>Publish to a team</strong><small>Give players exactly what to work on</small></span></article></div></section>
        <section className="stats"><article><small>VAULT RESOURCES</small><b>{resources.length}</b><span>{resources.filter(r=>r.status==='Private').length} private</span></article><article><small>PUBLISHED ITEMS</small><b>{resources.filter(r=>r.status==='Published').length}</b><span>Across {teams.length} teams</span></article><article><small>PLAYER REACH</small><b>{teams.reduce((a,t)=>a+t.players,0)}</b><span>Invited players</span></article><article><small>UPLOAD QUEUE</small><b>{uploads.length}</b><span>Awaiting review</span></article></section>
        <section className="sectionHead"><div><small>RECENT KNOWLEDGE</small><h2>Continue building your Coach Brain</h2></div><button onClick={()=>setActive('My Vault')}>View all →</button></section>
        <div className="cards">{resources.slice(0,3).map(r=><ResourceCard key={r.id} resource={r} onOpen={()=>setSelected(r)}/>)}</div>
      </>}

      {active==='My Vault'&&<>
        <section className="pageIntro"><span className="eyebrow dark">PRIVATE WORKSPACE</span><h2>My Vault</h2><p>Your coaching library is private by default. Publish only what you choose to a team space.</p></section>
        <div className="toolbar"><input placeholder="Search by title, concept, age group, or tag…" value={search} onChange={e=>setSearch(e.target.value)}/><select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>{['All','Practice Plan','Drill','Team Talk','Evaluation','Document','Video'].map(x=><option key={x}>{x}</option>)}</select><button className="primary" onClick={()=>setActive('Upload Center')}>+ Import</button></div>
        <div className="cards vaultCards">{visible.map(r=><ResourceCard key={r.id} resource={r} onOpen={()=>setSelected(r)}/>)}</div>
      </>}

      {active==='Upload Center'&&<>
        <section className="pageIntro uploadIntro"><span className="eyebrow dark">IMPORT + CATALOG</span><h2>Upload Center</h2><p>Bring in coaching material, preview what CoachVault detects, then approve how it enters your Vault. This release establishes the cataloging workflow; deeper PDF, Word, image, and video extraction follows next.</p></section>
        <section className="uploadLayout">
          <div className="dropZone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();handleFiles(e.dataTransfer.files)}} onClick={()=>inputRef.current?.click()}>
            <input ref={inputRef} type="file" multiple hidden onChange={e=>handleFiles(e.target.files)}/><div className="uploadIcon">⇧</div><h3>{processing?'Analyzing files…':'Drop files here'}</h3><p>PDF, Word, PowerPoint, images, video, text, CSV, and more</p><button className="primary" type="button">Choose files</button><small>Text-based files are read locally in this prototype. Other formats receive a metadata preview without uploading to a server.</small>
          </div>
          <aside className="extractionPlan"><span className="eyebrow dark">CATALOGING PIPELINE</span><h3>What CoachVault should extract</h3>{['Resource type','Title and summary','Concepts and coaching tags','Age or skill level','Duration and equipment','Drill steps and coaching points','Related teams and development goals'].map((x,i)=><div key={x}><b>{i+1}</b><span>{x}</span></div>)}</aside>
        </section>
        <section className="sectionHead"><div><small>REVIEW QUEUE</small><h2>{uploads.length?`${uploads.length} item${uploads.length>1?'s':''} ready for review`:'Nothing waiting yet'}</h2></div></section>
        <div className="uploadQueue">{uploads.map(item=><article key={item.id} className="uploadItem"><div className="fileMark">{item.type.slice(0,2).toUpperCase()}</div><div className="uploadMain"><div className="uploadTitle"><span><small>{item.sourceName}</small><h3>{item.title}</h3></span><em>{item.confidence}% confidence</em></div><div className="catalogGrid"><label>Detected type<strong>{item.type}</strong></label><label>Age group<strong>{item.ageGroup}</strong></label><label>Text extraction<strong>{item.textExtracted?'Complete':'Metadata only'}</strong></label><label>File size<strong>{Math.max(1,Math.round(item.size/1024))} KB</strong></label></div><div className="tagRow">{item.tags.map(t=><span key={t}>{t}</span>)}</div><div className="uploadActions"><button className="ghost" onClick={()=>setUploads(curr=>curr.filter(x=>x.id!==item.id))}>Remove</button><button className="primary" onClick={()=>addUploadToVault(item)}>Approve & add to Vault</button></div></div></article>)}</div>
      </>}

      {active==='Team Spaces'&&<>
        <section className="pageIntro"><span className="eyebrow dark">PLAYER DELIVERY</span><h2>Team Spaces</h2><p>Create a team, invite players, and publish selected resources from your private Vault. No registration, payments, or league administration.</p></section>
        <div className="teamHeader"><div><b>{teams.length}</b><span>Active team spaces</span></div><button className="primary" onClick={()=>setShowCreateTeam(true)}>+ Create team</button></div>
        <div className="teamGrid">{teams.map(team=><article className="teamCard" key={team.id}><div className={`teamBadge ${team.color}`}>{team.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</div><div><small>{team.sport}</small><h3>{team.name}</h3><p>{team.players} players invited</p></div><div className="teamActions"><button className="ghost" onClick={()=>setShowInvite(team)}>Invite players</button><button className="primary" onClick={()=>{setPublishTarget(team.name);setActive('My Vault')}}>Publish resource</button></div><section><span><b>{resources.filter(r=>r.team===team.name).length}</b><small>Resources</small></span><span><b>{resources.filter(r=>r.team===team.name&&r.type==='Drill').length}</b><small>Drills</small></span><span><b>0</b><small>Assignments</small></span></section></article>)}</div>
      </>}
    </section>

    {selected&&<div className="modalBack" onMouseDown={()=>setSelected(null)}><div className="modal" onMouseDown={e=>e.stopPropagation()}><button className="close" onClick={()=>setSelected(null)}>×</button><span className="eyebrow dark">{selected.type}</span><h2>{selected.title}</h2><p>{selected.description}</p><div className="detailMeta"><span><small>STATUS</small><b>{selected.status}</b></span><span><small>SHARED WITH</small><b>{selected.team}</b></span><span><small>UPDATED</small><b>{selected.updated}</b></span></div><div className="tagRow">{selected.tags.map(t=><span key={t}>{t}</span>)}</div><hr/><h3>Publish to a team</h3><p className="muted">Publishing creates a player-facing copy while keeping the original in your private Vault.</p><select className="fullSelect" value={publishTarget} onChange={e=>setPublishTarget(e.target.value)}>{teams.map(t=><option key={t.id}>{t.name}</option>)}<option>All Teams</option></select><button className="primary wide" onClick={()=>publishResource(selected,publishTarget)}>Publish resource</button></div></div>}

    {showCreateTeam&&<div className="modalBack"><div className="modal small"><button className="close" onClick={()=>setShowCreateTeam(false)}>×</button><span className="eyebrow dark">NEW TEAM SPACE</span><h2>Create a team</h2><form onSubmit={e=>{e.preventDefault();addTeam(e.currentTarget)}}><label>Team name<input name="name" required placeholder="Example: 2034 Girls"/></label><label>Sport<input name="sport" defaultValue="Lacrosse"/></label><button className="primary wide">Create team space</button></form></div></div>}

    {showInvite&&<div className="modalBack"><div className="modal small"><button className="close" onClick={()=>setShowInvite(null)}>×</button><span className="eyebrow dark">INVITE PLAYERS</span><h2>{showInvite.name}</h2><p>Share this invitation code with players or parents:</p><div className="inviteCode">{showInvite.inviteCode}</div><p className="muted">Player accounts and real email invitations will be connected when authentication and the database are added.</p><button className="primary wide" onClick={()=>navigator.clipboard?.writeText(showInvite.inviteCode)}>Copy invite code</button></div></div>}
  </main>
}

function ResourceCard({resource,onOpen}){
  return <article className="resourceCard" onClick={onOpen}><div className="resourceTop"><span className="typePill">{resource.type}</span><span className={`status ${resource.status==='Published'?'published':''}`}>{resource.status}</span></div><h3>{resource.title}</h3><p>{resource.description}</p><div className="tagRow">{resource.tags.slice(0,3).map(t=><span key={t}>{t}</span>)}</div><footer><small>{resource.updated}</small><b>{resource.status==='Published'?resource.team:'Open →'}</b></footer></article>
}
