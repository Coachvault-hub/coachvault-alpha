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
  createShare,
  getShares,
  saveShares,
  shareUrl
} from '../lib/formShareStore';
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
  return {
    id:uid('field'),
    type:'short_text',
    label:'',
    helpText:'',
    required:false,
    options:[],
    scaleMin:1,
    scaleMax:5,
    logic:{enabled:false,fieldId:'',operator:'equals',value:''}
  };
}

export default function SeasonRoadmapPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [resources, setResources] = useState(DEFAULT_ROADMAP);
  const [forms, setForms] = useState(FORM_TEMPLATES);
  const [responses, setResponses] = useState([]);
  const [publicResponses, setPublicResponses] = useState([]);
  const [completed, setCompleted] = useState({});
  const [phaseFilter, setPhaseFilter] = useState('All');
  const [resourceModal, setResourceModal] = useState(false);
  const [formBuilderOpen, setFormBuilderOpen] = useState(false);
  const [activeForm, setActiveForm] = useState(null);
  const [formAnswers, setFormAnswers] = useState({});
  const [responseViewer, setResponseViewer] = useState(null);
  const [shares, setShares] = useState([]);
  const [shareModal, setShareModal] = useState(null);
  const [shareDraft, setShareDraft] = useState({scope:'team',teamName:'',label:'',allowAnonymous:true});
  const [copiedShare, setCopiedShare] = useState('');

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
      setPublicResponses(readLocal('coachvault-public-form-responses-v1', []));
      setShares(getShares());
      setCompleted(readLocal(`coachvault-roadmap-completions-${current.user.id}`, {}));
    });
  }, [router]);

  useEffect(()=>{ if(authReady) writeLocal('coachvault-season-roadmap-v2',resources); },[resources,authReady]);
  useEffect(()=>{ if(authReady) writeLocal('coachvault-native-forms-v1',forms); },[forms,authReady]);
  useEffect(()=>{ if(authReady) writeLocal('coachvault-form-responses-v1',responses); },[responses,authReady]);
  useEffect(()=>{ if(authReady && session?.user) writeLocal(`coachvault-roadmap-completions-${session.user.id}`,completed); },[completed,authReady,session]);
  useEffect(()=>{ if(authReady) saveShares(shares); },[shares,authReady]);

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

  function fieldIsVisible(field, answers=formAnswers) {
    if (!field?.logic?.enabled || !field.logic.fieldId) return true;
    const source = answers[field.logic.fieldId];
    const expected = field.logic.value;
    const operator = field.logic.operator || 'equals';

    if (operator === 'equals') return String(source ?? '') === String(expected ?? '');
    if (operator === 'not_equals') return String(source ?? '') !== String(expected ?? '');
    if (operator === 'contains') {
      if (Array.isArray(source)) return source.includes(expected);
      return String(source ?? '').toLowerCase().includes(String(expected ?? '').toLowerCase());
    }
    if (operator === 'answered') return source !== undefined && source !== null && source !== '' && (!Array.isArray(source) || source.length > 0);
    if (operator === 'not_answered') return source === undefined || source === null || source === '' || (Array.isArray(source) && source.length === 0);
    return true;
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
      answers:Object.fromEntries(
        Object.entries(formAnswers).filter(([key])=>{
          const field=activeForm.fields.find(f=>f.id===key);
          return !field || fieldIsVisible(field,formAnswers);
        })
      )
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

  function startFormBuilder(template=null, phase=null) {
    if (phase) {
      setDraftResource(current=>({...current,phase,type:'Form'}));
    }
    if (template) {
      setDraftForm({
        ...template,
        id:uid('form'),
        name:`${template.name} Copy`,
        fields:template.fields.map(f=>({
          ...f,
          id:uid('field'),
          options:[...(f.options||[])],
          logic:{enabled:false,fieldId:'',operator:'equals',value:'',...(f.logic||{})}
        }))
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
    setDraftResource(current=>({...current,type:'Form',formTemplateId:cleaned.id,title:current.title || cleaned.name,description:current.description || cleaned.description}));
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

  function openShare(form, item=null) {
    const defaultScope = canManage ? 'club' : 'team';
    setShareDraft({
      scope:defaultScope,
      teamName:canManage ? '' : (session.user.team_name || ''),
      label:item?.title || form.name,
      allowAnonymous:true
    });
    setShareModal({form,item});
    setCopiedShare('');
  }

  function publishShare(e) {
    e.preventDefault();
    if (!shareModal?.form) return;

    const newShare = createShare({
      form:shareModal.form,
      createdBy:session.user,
      organizationId:session.user.organization_id,
      scope:canManage ? shareDraft.scope : 'team',
      teamName:canManage ? shareDraft.teamName : (session.user.team_name || shareDraft.teamName),
      label:shareDraft.label,
      allowAnonymous:shareDraft.allowAnonymous
    });

    setShares(current=>[newShare,...current]);
    setShareModal({...shareModal,published:newShare});
  }

  async function copyShareLink(token) {
    const url = shareUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedShare(token);
    } catch (_) {
      setCopiedShare(url);
    }
  }

  function disableShare(id) {
    setShares(current=>current.map(s=>s.id===id?{...s,active:false}:s));
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
          <button className="addRoadmapBtn" onClick={()=>setResourceModal(true)}>+ Add Roadmap Item</button>
        </div>}
      </section>

      {canManage && (
        <section className="directorDashboard">
          <div className="directorStat"><b>{resources.length}</b><span>Roadmap items</span></div>
          <div className="directorStat"><b>{forms.length}</b><span>Native forms</span></div>
          <div className="directorStat"><b>{responses.length+publicResponses.length}</b><span>Form submissions</span></div>
          <div className="directorStat"><b>{shares.filter(s=>s.active).length}</b><span>Active share links</span></div>
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
                <header>
                  <div><small>SEASON PHASE</small><h2>{phase}</h2></div>
                  <div className="phaseHeaderActions">
                    <span>{items.length} {items.length===1?'item':'items'}</span>
                    {canManage&&<button onClick={()=>startFormBuilder(null,phase)}>+ Build Form for {phase}</button>}
                  </div>
                </header>
                <div className="roadmapCards">
                  {items.map(item=>{
                    const done=Boolean(completed[item.id]);
                    const formSubmissions=responses.filter(r=>r.roadmap_item_id===item.id);
                    const linkedForm=forms.find(f=>f.id===item.formTemplateId)||templateById(item.formTemplateId);
                    const formShares=linkedForm?shares.filter(s=>s.form_id===linkedForm.id&&s.active):[];
                    return (
                      <article key={item.id} className={`roadmapResource ${done?'done':''}`}>
                        <div className="resourceTop">
                          <span className={`resourceType type-${item.type.toLowerCase()}`}>{item.type}</span>
                          {item.required&&<span className="requiredTag">Required</span>}
                          {item.type==='Form'&&<span className="submissionCount">{formSubmissions.length} responses{formShares.length?` · ${formShares.length} shared`:''}</span>}
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
                              {item.type==='Form' ? (
                                <div className="formCardActions">
                                  <button className="completeBtn" onClick={()=>setResponseViewer({formId:item.formTemplateId,item})}>Responses</button>
                                  {linkedForm&&<button className="shareFormBtn" onClick={()=>openShare(linkedForm,item)}>Share Form</button>}
                                </div>
                              ) : <span className="linkPending">{item.url?'Resource linked':'No link yet'}</span>}
                              <button className="roadmapOpenBtn" onClick={()=>openResource(item)}>{item.type==='Form'?'Preview':'Open'} →</button>
                            </>
                          ) : (
                            <>
                              <div className="formCardActions">
                                <button className={`completeBtn ${done?'done':''}`} onClick={()=>item.type==='Form'?openResource(item):completeResource(item)}>
                                  {done?'✓ Complete':item.type==='Form'?'Complete Form':'Mark Complete'}
                                </button>
                                {item.type==='Form'&&linkedForm&&<button className="shareFormBtn" onClick={()=>openShare(linkedForm,item)}>Share to Team</button>}
                              </div>
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
                  <button type="button" className="inlineBuilderBtn" onClick={()=>startFormBuilder(null,draftResource.phase)}>Build a new form</button>
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
              <div><small>COACHVAULT FORM BUILDER</small><h2>Build a smart season form</h2><p>Use sections, rich question types, and IF / THEN logic to collect exactly what your program needs.</p></div>
              <button onClick={()=>setFormBuilderOpen(false)}>×</button>
            </header>

            <div className="templateStrip">
              <span>Start from a template:</span>
              {FORM_TEMPLATES.map(t=><button key={t.id} onClick={()=>startFormBuilder(t,draftResource.phase)}>{t.name}</button>)}
            </div>

            <form onSubmit={saveBuiltForm} className="formBuilderBody">
              <div className="builderMeta">
                <label><span>Form name</span><input value={draftForm.name} onChange={e=>setDraftForm({...draftForm,name:e.target.value})}/></label>
                <label><span>Description</span><input value={draftForm.description} onChange={e=>setDraftForm({...draftForm,description:e.target.value})}/></label>
              </div>

              <div className="builderFields">
                {draftForm.fields.map((field,index)=>(
                  <article key={field.id} className={`builderField ${field.type==='section'?'sectionField':''}`}>
                    <div className="builderFieldNum">{index+1}</div>
                    <div className="builderFieldControls">
                      <div className="fieldTitleRow">
                        <input className="fieldLabelInput" value={field.label} onChange={e=>updateField(field.id,{label:e.target.value})} placeholder={field.type==='section'?'Section title':'Question'}/>
                        <button type="button" className="fieldRemoveBtn" onClick={()=>removeField(field.id)}>×</button>
                      </div>

                      {field.type!=='section'&&(
                        <input className="fieldHelpInput" value={field.helpText||''} onChange={e=>updateField(field.id,{helpText:e.target.value})} placeholder="Optional help text or instructions"/>
                      )}

                      <div className="fieldSettingsRow">
                        <select value={field.type} onChange={e=>updateField(field.id,{type:e.target.value})}>
                          {FIELD_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>

                        {field.type!=='section'&&(
                          <label className="fieldRequired">
                            <input type="checkbox" checked={field.required} onChange={e=>updateField(field.id,{required:e.target.checked})}/>
                            <span>Required</span>
                          </label>
                        )}
                      </div>

                      {['select','radio','checkboxes'].includes(field.type)&&(
                        <div className="optionsEditor">
                          <span>Answer choices</span>
                          <input value={(field.options||[]).join(', ')} onChange={e=>updateField(field.id,{options:e.target.value.split(',').map(x=>x.trim())})} placeholder="Choice 1, Choice 2, Choice 3"/>
                        </div>
                      )}

                      {field.type==='scale'&&(
                        <div className="scaleEditor">
                          <label><span>Minimum</span><input type="number" value={field.scaleMin||1} onChange={e=>updateField(field.id,{scaleMin:Number(e.target.value)})}/></label>
                          <label><span>Maximum</span><input type="number" value={field.scaleMax||5} onChange={e=>updateField(field.id,{scaleMax:Number(e.target.value)})}/></label>
                        </div>
                      )}

                      {field.type!=='section'&&index>0&&(
                        <details className="logicBuilder" open={field.logic?.enabled}>
                          <summary>
                            <span>IF / THEN Logic</span>
                            <label onClick={e=>e.stopPropagation()}>
                              <input type="checkbox" checked={Boolean(field.logic?.enabled)} onChange={e=>updateField(field.id,{logic:{...(field.logic||{}),enabled:e.target.checked}})}/>
                              Enable
                            </label>
                          </summary>

                          {field.logic?.enabled&&(
                            <div className="logicGrid">
                              <div className="logicStatement"><b>IF</b></div>
                              <select value={field.logic?.fieldId||''} onChange={e=>updateField(field.id,{logic:{...(field.logic||{}),fieldId:e.target.value}})}>
                                <option value="">Choose previous question…</option>
                                {draftForm.fields.slice(0,index).filter(f=>f.type!=='section').map(f=><option key={f.id} value={f.id}>{f.label||`Question ${draftForm.fields.indexOf(f)+1}`}</option>)}
                              </select>
                              <select value={field.logic?.operator||'equals'} onChange={e=>updateField(field.id,{logic:{...(field.logic||{}),operator:e.target.value}})}>
                                <option value="equals">equals</option>
                                <option value="not_equals">does not equal</option>
                                <option value="contains">contains</option>
                                <option value="answered">is answered</option>
                                <option value="not_answered">is not answered</option>
                              </select>
                              {!['answered','not_answered'].includes(field.logic?.operator)&&(
                                <input value={field.logic?.value||''} onChange={e=>updateField(field.id,{logic:{...(field.logic||{}),value:e.target.value}})} placeholder="Answer / value"/>
                              )}
                              <div className="logicStatement then"><b>THEN</b><span>show this question</span></div>
                            </div>
                          )}
                        </details>
                      )}
                    </div>
                  </article>
                ))}
                
              </div>
              <button type="button" className="addFieldBtn" onClick={addField}>+ Add Question or Section</button>
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
              {activeForm.fields.filter(field=>fieldIsVisible(field)).map(field=>{
                if(field.type==='section') return <div key={field.id} className="nativeSectionHeading"><h3>{field.label}</h3></div>;
                return (
                  <label key={field.id} className="nativeField">
                    <span>{field.label}{field.required&&<b>*</b>}</span>
                    {field.helpText&&<small>{field.helpText}</small>}
                    {field.type==='long_text' ? <textarea required={field.required} value={formAnswers[field.id]||''} onChange={e=>setFormAnswers({...formAnswers,[field.id]:e.target.value})}/>
                    : field.type==='select' ? <select required={field.required} value={formAnswers[field.id]||''} onChange={e=>setFormAnswers({...formAnswers,[field.id]:e.target.value})}><option value="">Select…</option>{(field.options||[]).map(o=><option key={o}>{o}</option>)}</select>
                    : field.type==='radio' ? <div className="choiceList">{(field.options||[]).map(o=><label key={o}><input required={field.required&&!formAnswers[field.id]} type="radio" name={field.id} value={o} checked={formAnswers[field.id]===o} onChange={()=>setFormAnswers({...formAnswers,[field.id]:o})}/><span>{o}</span></label>)}</div>
                    : field.type==='yes_no' ? <div className="choiceList horizontalChoices">{['Yes','No'].map(o=><label key={o}><input required={field.required&&!formAnswers[field.id]} type="radio" name={field.id} value={o} checked={formAnswers[field.id]===o} onChange={()=>setFormAnswers({...formAnswers,[field.id]:o})}/><span>{o}</span></label>)}</div>
                    : field.type==='checkboxes' ? <div className="choiceList">{(field.options||[]).map(o=>{const vals=formAnswers[field.id]||[];return <label key={o}><input type="checkbox" checked={vals.includes(o)} onChange={e=>setFormAnswers({...formAnswers,[field.id]:e.target.checked?[...vals,o]:vals.filter(x=>x!==o)})}/><span>{o}</span></label>})}</div>
                    : field.type==='scale' ? <div className="scaleChoices">{Array.from({length:(field.scaleMax||5)-(field.scaleMin||1)+1},(_,i)=>(field.scaleMin||1)+i).map(n=><button type="button" key={n} className={Number(formAnswers[field.id])===n?'active':''} onClick={()=>setFormAnswers({...formAnswers,[field.id]:n})}>{n}</button>)}</div>
                    : field.type==='acknowledgement' ? <label className="ackField"><input required={field.required} type="checkbox" checked={Boolean(formAnswers[field.id])} onChange={e=>setFormAnswers({...formAnswers,[field.id]:e.target.checked})}/><span>I acknowledge</span></label>
                    : <input required={field.required} type={field.type==='number'?'number':field.type==='date'?'date':field.type==='time'?'time':field.type==='email'?'email':field.type==='phone'?'tel':'text'} value={formAnswers[field.id]||''} onChange={e=>setFormAnswers({...formAnswers,[field.id]:e.target.value})}/>}
                  </label>
                );
              })}
            </div>
            <footer><button type="button" onClick={()=>setActiveForm(null)}>Cancel</button><button className="saveResourceBtn" type="submit">Submit Form</button></footer>
          </form>
        </div>
      )}

      {shareModal && (
        <div className="roadmapModal shareFormModal" onClick={()=>setShareModal(null)}>
          <section onClick={e=>e.stopPropagation()}>
            <header>
              <div>
                <small>{canManage?'DIRECTOR SHARING':'TEAM SHARING'}</small>
                <h2>Share {shareModal.form.name}</h2>
                <p>{canManage
                  ? 'Create a response link for a team, your entire club, or a broader audience.'
                  : 'Create a response link for your team. Players or parents can respond without a CoachVault account.'}</p>
              </div>
              <button onClick={()=>setShareModal(null)}>×</button>
            </header>

            {!shareModal.published ? (
              <form onSubmit={publishShare} className="shareFormBody">
                {canManage && (
                  <label>
                    <span>Who is this for?</span>
                    <div className="shareScopeChoices">
                      {[
                        ['club','Entire Club'],
                        ['team','Specific Team'],
                        ['public','Public / Open Link']
                      ].map(([value,label])=><button type="button" key={value} className={shareDraft.scope===value?'active':''} onClick={()=>setShareDraft({...shareDraft,scope:value})}>{label}</button>)}
                    </div>
                  </label>
                )}

                {(shareDraft.scope==='team'||!canManage)&&(
                  <label><span>Team</span><input required value={canManage?shareDraft.teamName:(session.user.team_name||shareDraft.teamName)} disabled={!canManage&&Boolean(session.user.team_name)} onChange={e=>setShareDraft({...shareDraft,teamName:e.target.value})} placeholder="2032 Boys"/></label>
                )}

                <label><span>Link label</span><input value={shareDraft.label} onChange={e=>setShareDraft({...shareDraft,label:e.target.value})}/></label>

                <label className="shareAnonymous">
                  <input type="checkbox" checked={shareDraft.allowAnonymous} onChange={e=>setShareDraft({...shareDraft,allowAnonymous:e.target.checked})}/>
                  <div><b>Allow responses without a CoachVault account</b><small>Best for players, parents, and club-wide surveys.</small></div>
                </label>

                <div className="sharePreview">
                  <span>SHARE TYPE</span>
                  <strong>{canManage ? (shareDraft.scope==='club'?'Entire Club':shareDraft.scope==='team'?`Team · ${shareDraft.teamName||'Choose team'}`:'Public Link') : `Team · ${session.user.team_name||shareDraft.teamName||'Your team'}`}</strong>
                  <p>Recipients will see a clean CoachVault form page with no Workspace access.</p>
                </div>

                <footer>
                  <button type="button" onClick={()=>setShareModal(null)}>Cancel</button>
                  <button className="publishShareBtn" type="submit">Create Share Link</button>
                </footer>
              </form>
            ) : (
              <div className="sharePublished">
                <div className="shareSuccessIcon">✓</div>
                <span>FORM LINK READY</span>
                <h3>{shareModal.published.label}</h3>
                <div className="shareLinkBox">
                  <input readOnly value={shareUrl(shareModal.published.token)}/>
                  <button onClick={()=>copyShareLink(shareModal.published.token)}>{copiedShare===shareModal.published.token?'Copied!':'Copy Link'}</button>
                </div>
                <p>Send this link by text, email, TeamLinkt, TeamSnap, or any club messaging system.</p>
                <div className="sharePublishedActions">
                  <a href={shareUrl(shareModal.published.token)} target="_blank" rel="noreferrer">Preview Form</a>
                  <button onClick={()=>setShareModal(null)}>Done</button>
                </div>
              </div>
            )}

            {canManage&&shares.filter(s=>s.form_id===shareModal.form.id&&s.active).length>0&&(
              <div className="existingShares">
                <span>ACTIVE LINKS</span>
                {shares.filter(s=>s.form_id===shareModal.form.id&&s.active).map(s=>(
                  <article key={s.id}>
                    <div><b>{s.label}</b><small>{s.scope}{s.team_name?` · ${s.team_name}`:''}</small></div>
                    <button onClick={()=>copyShareLink(s.token)}>Copy</button>
                    <button className="disableShareBtn" onClick={()=>disableShare(s.id)}>Disable</button>
                  </article>
                ))}
              </div>
            )}
          </section>
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
