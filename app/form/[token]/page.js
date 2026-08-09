'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { FIELD_TYPES, readLocal, writeLocal } from '../../lib/roadmapStore';
import { getShares } from '../../lib/formShareStore';

function fieldVisible(field, answers) {
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

function uid(prefix='response') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
}

export default function PublicCoachVaultForm() {
  const params = useParams();
  const token = params?.token;
  const [share, setShare] = useState(null);
  const [answers, setAnswers] = useState({});
  const [respondent, setRespondent] = useState({name:'',email:'',team:''});
  const [submitted, setSubmitted] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const found = getShares().find(item => item.token === token && item.active);
    setShare(found || null);
    setMissing(!found);
  }, [token]);

  const form = share?.form_snapshot;

  function submit(e) {
    e.preventDefault();
    if (!share || !form) return;

    const visibleAnswers = Object.fromEntries(
      Object.entries(answers).filter(([id]) => {
        const field = form.fields.find(f => f.id === id);
        return !field || fieldVisible(field, answers);
      })
    );

    const existing = readLocal('coachvault-public-form-responses-v1', []);
    const submission = {
      id:uid(),
      share_id:share.id,
      share_token:share.token,
      form_id:form.id,
      form_name:form.name,
      organization_id:share.organization_id,
      scope:share.scope,
      team_name:share.team_name || respondent.team,
      respondent,
      answers:visibleAnswers,
      submitted_at:new Date().toISOString()
    };
    writeLocal('coachvault-public-form-responses-v1', [submission, ...existing]);
    setSubmitted(true);
  }

  if (missing) {
    return (
      <main className="publicFormPage">
        <section className="publicFormCard emptyPublicForm">
          <span className="publicFormLogo">CV</span>
          <h1>This form link is not available.</h1>
          <p>It may have expired, been disabled, or this demo link may have been opened on a different browser.</p>
          <Link href="/">CoachVault Home</Link>
        </section>
      </main>
    );
  }

  if (!share || !form) {
    return <main className="publicFormPage"><div className="publicFormLoading">Loading CoachVault form…</div></main>;
  }

  if (submitted) {
    return (
      <main className="publicFormPage">
        <section className="publicFormCard publicFormThanks">
          <span className="publicFormLogo">CV</span>
          <span className="publicFormEyebrow">RESPONSE RECEIVED</span>
          <h1>Thanks — you’re all set.</h1>
          <p>Your response to <b>{form.name}</b> has been submitted.</p>
          <div className="publicFormCheck">✓</div>
          <Link href="/">CoachVault Home</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="publicFormPage">
      <header className="publicFormTop">
        <Link href="/" className="publicFormBrand"><span>CV</span><b>CoachVault</b></Link>
        <small>{share.scope === 'club' ? 'Club Form' : share.scope === 'team' ? 'Team Form' : 'Shared Form'}</small>
      </header>

      <section className="publicFormCard">
        <div className="publicFormHeading">
          <span className="publicFormEyebrow">COACHVAULT FORM</span>
          <h1>{form.name}</h1>
          <p>{form.description}</p>
          {share.team_name && <div className="publicFormAudience">For: {share.team_name}</div>}
        </div>

        <form onSubmit={submit}>
          <section className="respondentBlock">
            <h2>About you</h2>
            <div className="respondentGrid">
              <label><span>Name</span><input required value={respondent.name} onChange={e=>setRespondent({...respondent,name:e.target.value})}/></label>
              <label><span>Email</span><input type="email" required value={respondent.email} onChange={e=>setRespondent({...respondent,email:e.target.value})}/></label>
              {!share.team_name && <label><span>Team / group</span><input value={respondent.team} onChange={e=>setRespondent({...respondent,team:e.target.value})}/></label>}
            </div>
          </section>

          <div className="publicNativeFields">
            {form.fields.filter(field=>fieldVisible(field,answers)).map(field=>{
              if(field.type==='section') return <section key={field.id} className="publicFormSection"><h2>{field.label}</h2></section>;

              return (
                <label key={field.id} className="publicNativeField">
                  <span>{field.label}{field.required&&<b>*</b>}</span>
                  {field.helpText&&<small>{field.helpText}</small>}

                  {field.type==='long_text' ? (
                    <textarea required={field.required} value={answers[field.id]||''} onChange={e=>setAnswers({...answers,[field.id]:e.target.value})}/>
                  ) : field.type==='select' ? (
                    <select required={field.required} value={answers[field.id]||''} onChange={e=>setAnswers({...answers,[field.id]:e.target.value})}>
                      <option value="">Select…</option>{(field.options||[]).map(o=><option key={o}>{o}</option>)}
                    </select>
                  ) : field.type==='radio' ? (
                    <div className="publicChoices">{(field.options||[]).map(o=><label key={o}><input required={field.required&&!answers[field.id]} type="radio" name={field.id} checked={answers[field.id]===o} onChange={()=>setAnswers({...answers,[field.id]:o})}/><span>{o}</span></label>)}</div>
                  ) : field.type==='yes_no' ? (
                    <div className="publicChoices horizontal">{['Yes','No'].map(o=><label key={o}><input required={field.required&&!answers[field.id]} type="radio" name={field.id} checked={answers[field.id]===o} onChange={()=>setAnswers({...answers,[field.id]:o})}/><span>{o}</span></label>)}</div>
                  ) : field.type==='checkboxes' ? (
                    <div className="publicChoices">{(field.options||[]).map(o=>{const vals=answers[field.id]||[];return <label key={o}><input type="checkbox" checked={vals.includes(o)} onChange={e=>setAnswers({...answers,[field.id]:e.target.checked?[...vals,o]:vals.filter(x=>x!==o)})}/><span>{o}</span></label>})}</div>
                  ) : field.type==='scale' ? (
                    <div className="publicScale">{Array.from({length:(field.scaleMax||5)-(field.scaleMin||1)+1},(_,i)=>(field.scaleMin||1)+i).map(n=><button type="button" key={n} className={Number(answers[field.id])===n?'active':''} onClick={()=>setAnswers({...answers,[field.id]:n})}>{n}</button>)}</div>
                  ) : field.type==='acknowledgement' ? (
                    <label className="publicAck"><input required={field.required} type="checkbox" checked={Boolean(answers[field.id])} onChange={e=>setAnswers({...answers,[field.id]:e.target.checked})}/><span>I acknowledge</span></label>
                  ) : (
                    <input required={field.required} type={field.type==='number'?'number':field.type==='date'?'date':field.type==='time'?'time':field.type==='email'?'email':field.type==='phone'?'tel':'text'} value={answers[field.id]||''} onChange={e=>setAnswers({...answers,[field.id]:e.target.value})}/>
                  )}
                </label>
              );
            })}
          </div>

          <footer className="publicFormFooter">
            <p>Responses are collected by the organization that shared this form.</p>
            <button type="submit">Submit Response</button>
          </footer>
        </form>
      </section>
    </main>
  );
}
