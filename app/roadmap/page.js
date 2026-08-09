'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCurrentCoachVaultSession,
  roleCanManage,
  signOutCoachVault,
  hasSupabaseConfig
} from '../lib/coachvaultAuth';
import {
  PHASES,
  FIELD_TYPES,
  FORM_TEMPLATES,
  DEFAULT_ROADMAP,
  readLocal,
  writeLocal,
  templateById
} from '../lib/roadmapStore';

function uid(prefix='item') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
}

function blankField() {
  return {id:uid('field'), type:'short_text', label:'', required:false, options:[]};
}

export default function SeasonRoadmapPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [resources, setResources] = useState(DEFAULT_ROADMAP);
  const [forms, setForms] = useState(FORM_TEMPLATES);
  const [responses, setResponses] = useState([]);
  const [completed, setCompleted] = useState({});
  const [phaseFilter, setPhaseFilter] = useState('All');
  const [resourceModal, setResourceModal] = useState(false);
  const [formBuilderOpen, setFormBuilderOpen] = useState(false);
  const [activeForm, setActiveForm] = useState(null);
  const [formAnswers, setFormAnswers] = useState({});
  const [responseViewer, setResponseViewer] = useState(null);
  const [draftResource, setDraftResource] = useState({
    phase:'Preseason Setup', title:'', type:'Form', due:'', audience:'All coaches',
    required:true, description:'', url:'', formTemplateId:''
  });
  const [draftForm, setDraftForm] = useState({
    id:'', name:'Untitled Form', description:'', fields:[blankField()]
  });

  useEffect(() => {
    getCurrentCoachVaultSession().then(current => {
      if (!current?.user) {
        router.replace('/login');
        return;
      }
      setSession(current);
      setAuthReady(true);
      setResources(readLocal('coachvault-season-roadmap-v2', DEFAULT_ROADMAP));
      setForms(readLocal('coachvault-native-forms-v1', FORM_TEMPLATES));
      setResponses(readLocal('coachvault-form-responses-v1', []));
      setCompleted(readLocal(`coachvault-roadmap-completions-${current.user.id}`, {}));
    });
  }, [router]);

  useEffect(()=>{ if(authReady) writeLocal('coachvault-season-roadmap-v2',resources); },[resources,authReady]);
  useEffect(()=>{ if(authReady) writeLocal('coachvault-native-forms-v1',forms); },[forms,authReady]);
  useEffect(()=>{ if(authReady) writeLocal('coachvault-form-responses-v1',responses); },[responses,authReady]);
  useEffect(()=>{ if(authReady && session?.user) writeLocal(`coachvault-roadmap-completions-${session.user.id}`,completed); },[completed,authReady,session]);

  const canManage = roleCanManage(session?.user?.role);
  const visible = useMemo(
    ()=>phaseFilter==='All' ? resources : resources.filter(r=>r.phase===phaseFilter),
    [resources,phaseFilter]
  );
  const required = resources.filter(r=>r.required);
  const requiredDone = required.filter(r=>completed[r.id]).length;
  const progress = required.length ? Math.round(requiredDone/required.length*100) : 0;

  if (!authReady || !session) {
    return <main className="roadmapPage"><div className="authLoading">Loading your CoachVault roadmap…</div></main>;
  }

  function completeResource(id) {
    setCompleted(current=>({...current,[id]:!current[id]}));
  }

  function openResource(item) {
    if (item.type !== 'Form') {
      if (item.url) window.open(item.url,'_blank','noopener,noreferrer');
      else completeResource(item.id);
      return;
    }
    const form = forms.find(f=>f.id===item.formTemplateId) || templateById(item.formTemplateId);
    if (!form) return;
    setActiveForm({...form, roadmapItemId:item.id});
    setFormAnswers({});
  }

  function submitForm(e) {
    e.preventDefault();
    const submission = {
      id:uid('response'),
      form_id:activeForm.id,
      roadmap_item_id:activeForm.roadmapItemId,
      form_name:activeForm.name,
      user_id:session.user.id,
      user_name:session.user.full_name || session.user.email,
      team_name:session.user.team_name || '',
      organization_id:session.user.organization_id,
      submitted_at:new Date().toISOString(),
      answers:formAnswers
    };
    setResponses(current=>[submission,...current]);
    setCompleted(current=>({...current,[activeForm.roadmapItemId]:true}));
    setActiveForm(null);
  }

  function saveResource(e) {
    e.preventDefault();
    if (!draftResource.title.trim()) return;
    setResources(current=>[...current,{...draftResource,id:uid('roadmap'),title:draftResource.title.trim()}]);
    setDraftResource({phase:'Preseason Setup',title:'',type:'Form',due:'',audience:'All coaches',required:true,description:'',url:'',formTemplateId:''});
    setResourceModal(false);
  }

  function startFormBuilder(template=null) {
    if (template) {
      setDraftForm({
        ...template,
        id:uid('form'),
        name:`${template.name} Copy`,
        fields:template.fields.map(f=>({...f,id:uid('field'),options:[...(f.options||[])]}))
      });
    } else {
      setDraftForm({id:uid('form'),name:'Untitled Form',description:'',fields:[blankField()]});
    }
    setFormBuilderOpen(true);
  }

  function saveBuiltForm(e) {
    e.preventDefault();
    const cleaned = {
      ...draftForm,
      name:draftForm.name.trim() || 'Untitled Form',
      fields:draftForm.fields.filter(f=>f.label.trim()).map(f=>({
        ...f,
        label:f.label.trim(),
        options:(f.options||[]).filter(Boolean)
      }))
    };
    setForms(current=>[...current.filter(f=>f.id!==cleaned.id),cleaned]);
    setDraftResource(current=>({...current,type:'Form',formTemplateId:cleaned.id,title:current.title || cleaned.name}));
    setFormBuilderOpen(false);
    setResourceModal(true);
  }

  function updateField(id, patch) {
    setDraftForm(current=>({...current,fields:current.fields.map(f=>f.id===id?{...f,...patch}:f)}));
  }

  function addField() {
    setDraftForm(current=>({...current,fields:[...current.fields,blankField()]}));
  }

  function removeField(id) {
    setDraftForm(current=>({...current,fields:current.fields.filter(f=>f.id!==id)}));
  }

  async function logout() {
    await signOutCoachVault();
    router.push('/login');
  }

  const orgName = session.organization?.name || 'CoachVault Club';

  return (
    <main className="roadmapPage">
      <header className="roadmapTopbar">
        <Link href="/" className="roadmapBrand">
          <span className="roadmapLogo">CV</span>
          <div><strong>CoachVault</strong><small>{orgName}</small></div>
        </Link>
        <nav>
          <Link href="/">Home</Link>
          <Link href="/workspace">Workspace</Link>
          <Link href="/roadmap" className="active">Season Roadmap</Link>
        </nav>
        <div className="roadmapUser">
          <div><strong>{session.user.full_name || session.user.email}</strong><small>{session.user.role}{session.user.team_name?` · ${session.user.team_name}`:''}</small></div>
          <button onClick={logout}>Sign Out</button>
        </div>
      </header>

      <section className="roadmapHero">
        <div>
          <span className="roadmapEyebrow">{canManage?'DIRECTOR ROADMAP':'MY SEASON ROADMAP'}</span>
          <h1>{canManage?'Run the season without chasing coaches.':'Know exactly what your club needs from you.'}</h1>
          <p>{canManage
            ? 'Build the season path once. Assign forms, documents, meetings, and tasks so every coach knows what is due and when.'
            : 'Complete required forms, open club resources, and move through the season without hunting through email and old links.'}</p>
          <div className="roadmapRoleNote">
            <span className={hasSupabaseConfig()?'live':'demo'}>{hasSupabaseConfig()?'Live database mode':'Demo data mode'}</span>
            <b>{orgName}</b>
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
          {['All',...PHASES].map(phase=><button key={phase} className={phaseFilter===phase?'active':''} onClick={()=>setPhaseFilter(phase)}>{phase}</button>)}
        </div>
        {canManage && <div className="directorButtons">
          <button className="formBuilderBtn" onClick={()=>startFormBuilder()}>+ Build Form</button>
          <button className="addRoadmapBtn" onClick={()=>setResourceModal(true)}>+ Add Roadmap Item</button>
        </div>}
      </section>

      {canManage && (
        <section className="directorDashboard">
          <div className="directorStat"><b>{resources.length}</b><span>Roadmap items</span></div>
          <div className="directorStat"><b>{forms.length}</b><span>Native forms</span></div>
          <div className="directorStat"><b>{responses.length}</b><span>Form submissions</span></div>
          <button onClick={()=>setResponseViewer({formId:'all'})}>View Responses →</button>
        </section>
      )}

      <section className="roadmapTimeline">
        {PHASES.filter(phase=>phaseFilter==='All'||phase===phaseFilter).map((phase,phaseIndex)=>{
          const items=visible.filter(r=>r.phase===phase);
          if(!items.length)return null;
          return (
            <section className="roadmapPhase" key={phase}>
              <div className="phaseMarker"><span>{String(phaseIndex+1).padStart(2,'0')}</span><i/></div>
              <div className="phaseContent">
                <header><div><small>SEASON PHASE</small><h2>{phase}</h2></div><span>{items.length} {items.length===1?'item':'items'}</span></header>
                <div className="roadmapCards">
                  {items.map(item=>{
                    const done=Boolean(completed[item.id]);
                    const formSubmissions=responses.filter(r=>r.roadmap_item_id===item.id);
                    return (
                      <article key={item.id} className={`roadmapResource ${done?'done':''}`}>
                        <div className="resourceTop">
                          <span className={`resourceType type-${item.type.toLowerCase()}`}>{item.type}</span>
                          {item.required&&<span className="requiredTag">Required</span>}
                          {canManage&&item.type==='Form'&&<span className="submissionCount">{formSubmissions.length} responses</span>}
                        </div>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                        <div className="resourceMeta">
                          <div><small>DUE</small><b>{item.due||'No deadline'}</b></div>
                          <div><small>FOR</small><b>{item.audience}</b></div>
                        </div>
                        <footer>
                          {canManage ? (
                            <>
                              {item.type==='Form'
                                ? <button className="completeBtn" onClick={()=>setResponseViewer({formId:item.formTemplateId,item})}>View responses</button>
                                : <span className="linkPending">{item.url?'Resource linked':'No link yet'}</span>}
                              <button className="roadmapOpenBtn" onClick={()=>openResource(item)}>{item.type==='Form'?'Preview':'Open'} →</button>
                            </>
                          ) : (
                            <>
                              <button className={`completeBtn ${done?'done':''}`} onClick={()=>item.type==='Form'?openResource(item):completeResource(item)}>
                                {done?'✓ Complete':item.type==='Form'?'Complete Form':'Mark Complete'}
                              </button>
                              {item.url&&<a href={item.url} target="_blank" rel="noreferrer">Open resource →</a>}
                            </>
                          )}
                        </footer>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          )
        })}
      </section>

      {resourceModal && (
        <div className="roadmapModal" onClick={()=>setResourceModal(false)}>
          <form onSubmit={saveResource} onClick={e=>e.stopPropagation()}>
            <header><div><small>DIRECTOR TOOL</small><h2>Add roadmap item</h2></div><button type="button" onClick={()=>setResourceModal(false)}>×</button></header>
            <div className="roadmapFormGrid">
              <label><span>Title</span><input required value={draftResource.title} onChange={e=>setDraftResource({...draftResource,title:e.target.value})}/></label>
              <label><span>Season phase</span><select value={draftResource.phase} onChange={e=>setDraftResource({...draftResource,phase:e.target.value})}>{PHASES.map(p=><option key={p}>{p}</option>)}</select></label>
              <label><span>Type</span><select value={draftResource.type} onChange={e=>setDraftResource({...draftResource,type:e.target.value})}>{['Form','Document','Link','Task','Meeting'].map(x=><option key={x}>{x}</option>)}</select></label>
              <label><span>Due / timing</span><input value={draftResource.due} onChange={e=>setDraftResource({...draftResource,due:e.target.value})} placeholder="August 15"/></label>
              <label><span>Audience</span><input value={draftResource.audience} onChange={e=>setDraftResource({...draftResource,audience:e.target.value})}/></label>
              {draftResource.type==='Form' ? (
                <label><span>CoachVault Form</span>
                  <select value={draftResource.formTemplateId} onChange={e=>setDraftResource({...draftResource,formTemplateId:e.target.value})}>
                    <option value="">Select form…</option>
                    {forms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <button type="button" className="inlineBuilderBtn" onClick={()=>startFormBuilder()}>Build a new form</button>
                </label>
              ) : (
                <label><span>URL</span><input value={draftResource.url} onChange={e=>setDraftResource({...draftResource,url:e.target.value})} placeholder="https://…"/></label>
              )}
              <label className="full"><span>Description</span><textarea value={draftResource.description} onChange={e=>setDraftResource({...draftResource,description:e.target.value})}/></label>
              <label className="requiredCheck full"><input type="checkbox" checked={draftResource.required} onChange={e=>setDraftResource({...draftResource,required:e.target.checked})}/><span>Required item</span></label>
            </div>
            <footer><button type="button" onClick={()=>setResourceModal(false)}>Cancel</button><button className="saveResourceBtn" type="submit">Add to Roadmap</button></footer>
          </form>
        </div>
      )}

      {formBuilderOpen && (
        <div className="formBuilderOverlay">
          <section className="formBuilderShell">
            <header>
              <div><small>COACHVAULT FORM BUILDER</small><h2>Build a native form</h2><p>Create it once, assign it on the roadmap, and track every submission.</p></div>
              <button onClick={()=>setFormBuilderOpen(false)}>×</button>
            </header>

            <div className="templateStrip">
              <span>Start from a template:</span>
              {FORM_TEMPLATES.map(t=><button key={t.id} onClick={()=>startFormBuilder(t)}>{t.name}</button>)}
            </div>

            <form onSubmit={saveBuiltForm} className="formBuilderBody">
              <div className="builderMeta">
                <label><span>Form name</span><input value={draftForm.name} onChange={e=>setDraftForm({...draftForm,name:e.target.value})}/></label>
                <label><span>Description</span><input value={draftForm.description} onChange={e=>setDraftForm({...draftForm,description:e.target.value})}/></label>
              </div>

              <div className="builderFields">
                {draftForm.fields.map((field,index)=>(
                  <article key={field.id} className="builderField">
                    <div className="builderFieldNum">{index+1}</div>
                    <div className="builderFieldControls">
                      <input className="fieldLabelInput" value={field.label} onChange={e=>updateField(field.id,{label:e.target.value})} placeholder="Question"/>
                      <div className="fieldSettingsRow">
                        <select value={field.type} onChange={e=>updateField(field.id,{type:e.target.value})}>
                          {FIELD_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <label className="fieldRequired"><input type="checkbox" checked={field.required} onChange={e=>updateField(field.id,{required:e.target.checked})}/><span>Required</span></label>
                        <button type="button" onClick={()=>removeField(field.id)}>Remove</button>
                      </div>
                      {['select','radio','checkboxes'].includes(field.type)&&(
                        <input value={(field.options||[]).join(', ')} onChange={e=>updateField(field.id,{options:e.target.value.split(',').map(x=>x.trim())})} placeholder="Options separated by commas"/>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              <button type="button" className="addFieldBtn" onClick={addField}>+ Add Question</button>
              <footer><button type="button" onClick={()=>setFormBuilderOpen(false)}>Cancel</button><button className="saveFormBtn" type="submit">Save CoachVault Form</button></footer>
            </form>
          </section>
        </div>
      )}

      {activeForm && (
        <div className="roadmapModal nativeFormModal" onClick={()=>setActiveForm(null)}>
          <form onSubmit={submitForm} onClick={e=>e.stopPropagation()}>
            <header><div><small>COACHVAULT FORM</small><h2>{activeForm.name}</h2><p>{activeForm.description}</p></div><button type="button" onClick={()=>setActiveForm(null)}>×</button></header>
            <div className="nativeFields">
              {activeForm.fields.map(field=>(
                <label key={field.id} className="nativeField">
                  <span>{field.label}{field.required&&<b>*</b>}</span>
                  {field.type==='long_text' ? <textarea required={field.required} value={formAnswers[field.id]||''} onChange={e=>setFormAnswers({...formAnswers,[field.id]:e.target.value})}/>
                  : field.type==='select' ? <select required={field.required} value={formAnswers[field.id]||''} onChange={e=>setFormAnswers({...formAnswers,[field.id]:e.target.value})}><option value="">Select…</option>{(field.options||[]).map(o=><option key={o}>{o}</option>)}</select>
                  : field.type==='radio' ? <div className="choiceList">{(field.options||[]).map(o=><label key={o}><input type="radio" name={field.id} value={o} checked={formAnswers[field.id]===o} onChange={()=>setFormAnswers({...formAnswers,[field.id]:o})}/><span>{o}</span></label>)}</div>
                  : field.type==='checkboxes' ? <div className="choiceList">{(field.options||[]).map(o=>{const vals=formAnswers[field.id]||[];return <label key={o}><input type="checkbox" checked={vals.includes(o)} onChange={e=>setFormAnswers({...formAnswers,[field.id]:e.target.checked?[...vals,o]:vals.filter(x=>x!==o)})}/><span>{o}</span></label>})}</div>
                  : field.type==='acknowledgement' ? <label className="ackField"><input required={field.required} type="checkbox" checked={Boolean(formAnswers[field.id])} onChange={e=>setFormAnswers({...formAnswers,[field.id]:e.target.checked})}/><span>I acknowledge</span></label>
                  : <input required={field.required} type={field.type==='number'?'number':field.type==='date'?'date':'text'} value={formAnswers[field.id]||''} onChange={e=>setFormAnswers({...formAnswers,[field.id]:e.target.value})}/>}
                </label>
              ))}
            </div>
            <footer><button type="button" onClick={()=>setActiveForm(null)}>Cancel</button><button className="saveResourceBtn" type="submit">Submit Form</button></footer>
          </form>
        </div>
      )}

      {responseViewer && (
        <div className="roadmapModal responseModal" onClick={()=>setResponseViewer(null)}>
          <section onClick={e=>e.stopPropagation()}>
            <header><div><small>DIRECTOR RESPONSES</small><h2>{responseViewer.item?.title||'Form Responses'}</h2></div><button onClick={()=>setResponseViewer(null)}>×</button></header>
            <div className="responseList">
              {responses.filter(r=>responseViewer.formId==='all'||r.form_id===responseViewer.formId).length===0
                ? <div className="emptyResponses">No responses yet.</div>
                : responses.filter(r=>responseViewer.formId==='all'||r.form_id===responseViewer.formId).map(r=>(
                  <article key={r.id}>
                    <header><div><strong>{r.user_name}</strong><span>{r.team_name||'No team'}</span></div><time>{new Date(r.submitted_at).toLocaleString()}</time></header>
                    <h3>{r.form_name}</h3>
                    <dl>{Object.entries(r.answers||{}).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{Array.isArray(value)?value.join(', '):String(value)}</dd></div>)}</dl>
                  </article>
                ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
