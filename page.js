"use client";
import {Archive,ArrowRight,BookOpen,BrainCircuit,CalendarDays,ClipboardPlus,Dumbbell,FolderKanban,Menu,PlayCircle,Search,Sparkles,Users,Zap} from "lucide-react";
const recent=[
{title:"1-4-1 Ball Movement Progression",type:"Practice Plan",meta:"75 min · Boys 2032",icon:Dumbbell},
{title:"Tryout Evaluation Framework",type:"Evaluation",meta:"18 athletes · 6 categories",icon:ClipboardPlus},
{title:"Building a We > Me Culture",type:"Team Message",meta:"Leadership · Culture",icon:Users}
];
const library=[
{label:"Practice Plans",count:24,icon:Dumbbell},{label:"Drills",count:63,icon:PlayCircle},{label:"Team Messages",count:18,icon:BookOpen},{label:"Evaluations",count:11,icon:ClipboardPlus}
];
export default function Home(){return <main className="shell">
<aside className="sidebar">
<div className="brand"><div className="mark"><Zap size={18}/></div><div><div className="brand-name">CoachVault</div><div className="brand-sub">Coach smarter.</div></div></div>
<nav className="nav"><a className="nav-item active"><FolderKanban size={18}/>Dashboard</a><a className="nav-item"><Archive size={18}/>Vault</a><a className="nav-item"><BrainCircuit size={18}/>AI Builder</a><a className="nav-item"><CalendarDays size={18}/>Season Planner</a><a className="nav-item"><Users size={18}/>Teams</a></nav>
<div className="sidebar-card"><div className="eyebrow">COACHVAULT AI</div><h3>Turn rough notes into a full practice.</h3><button className="dark-btn">Try the Builder <ArrowRight size={16}/></button></div>
<div className="profile"><div className="avatar">JB</div><div><strong>Jordan Bird</strong><span>Club Director</span></div></div>
</aside>
<section className="content"><header className="topbar"><button className="menu"><Menu size={20}/></button><div className="search"><Search size={18}/><input placeholder="Search your vault..."/></div><button className="ghost-btn">Share feedback</button><button className="primary-btn"><Sparkles size={17}/>Create</button></header>
<div className="page"><div className="hero"><div><div className="eyebrow accent">YOUR COACHING COMMAND CENTER</div><h1>Good afternoon, Jordan.</h1><p>Capture what works, build better practices, and keep your entire coaching system in one place.</p></div><div className="hero-actions"><button className="secondary-btn"><ClipboardPlus size={18}/>Capture an idea</button><button className="primary-btn large"><Sparkles size={18}/>Build with AI</button></div></div>
<div className="stats"><div className="stat"><span>Saved resources</span><strong>116</strong><small>Across 5 collections</small></div><div className="stat"><span>Practice plans</span><strong>24</strong><small>7 created this month</small></div><div className="stat"><span>Teams supported</span><strong>4</strong><small>Spring 2027 season</small></div><div className="stat highlight"><span>Time saved</span><strong>18.5h</strong><small>Estimated this month</small></div></div>
<div className="grid"><section className="panel"><div className="panel-head"><div><div className="eyebrow">RECENT WORK</div><h2>Pick up where you left off</h2></div><button className="text-btn">View all <ArrowRight size={15}/></button></div><div className="recent-list">{recent.map(({title,type,meta,icon:Icon})=><article className="recent-card" key={title}><div className="item-icon"><Icon size={20}/></div><div className="recent-copy"><span>{type}</span><h3>{title}</h3><p>{meta}</p></div><button className="circle"><ArrowRight size={17}/></button></article>)}</div></section>
<section className="panel ai-panel"><div className="ai-orb"><BrainCircuit size={32}/></div><div className="eyebrow accent">COACHVAULT AI</div><h2>What are you building today?</h2><p>Describe your team, age group, goals, and time available. CoachVault turns it into a usable plan.</p><div className="prompt">“Create a 90-minute practice for 17 players focused on faster ball movement.”</div><button className="primary-btn full">Start building <ArrowRight size={16}/></button></section></div>
<section className="panel library-panel"><div className="panel-head"><div><div className="eyebrow">YOUR VAULT</div><h2>Organized around how coaches actually work</h2></div></div><div className="library-grid">{library.map(({label,count,icon:Icon})=><div className="library-card" key={label}><div className="item-icon"><Icon size={20}/></div><div><strong>{label}</strong><span>{count} saved items</span></div><ArrowRight size={17}/></div>)}</div></section></div></section></main>}
