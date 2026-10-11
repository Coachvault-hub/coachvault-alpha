'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCurrentCoachVaultSession } from '../lib/coachvaultAuth';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email,setEmail] = useState('');
  const [status,setStatus] = useState('');
  const [sending,setSending] = useState(false);
  const error = params.get('error');

  useEffect(()=>{
    getCurrentCoachVaultSession().then(session=>{
      if (session?.user) router.replace('/workspace');
    });
  },[router]);

  async function submit(e) {
    e.preventDefault();
    setSending(true);
    setStatus('Sending your secure sign-in link…');
    try {
      const res = await fetch('/api/auth/request-link',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email})
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || 'CoachVault could not send the sign-in link.');
        return;
      }
      setStatus(data.message || 'Check your email for a sign-in link.');
    } catch (_) {
      setStatus('CoachVault could not send the sign-in link.');
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="authPage cavsAuthPage">
      <section className="authBrandPanel">
        <Link href="/" className="authBrand">
          <span>CV</span>
          <div><strong>CoachVault</strong><small>CAVS Lacrosse Club</small></div>
        </Link>
        <div className="authMessage">
          <span>CAVS COACH ACCESS</span>
          <h1>Your coaching hub. One secure link.</h1>
          <p>Enter the email address approved by CAVS. We’ll send you a private, single-use link to access the coaching tools assigned to you.</p>
          <div className="authFeatureList">
            <div><b>01</b><span>No password to remember</span></div>
            <div><b>02</b><span>No ChatGPT account required</span></div>
            <div><b>03</b><span>You only see the tools CAVS has approved for you</span></div>
          </div>
        </div>
      </section>

      <section className="authFormPanel">
        <div className="authFormWrap">
          <div className="authFormHeader"><Link href="/">← Home</Link><span className="authConnection ready">Email-link access</span></div>

          <form className="authForm" onSubmit={submit}>
            <div>
              <small>COACH SIGN IN</small>
              <h2>Send me a sign-in link</h2>
              <p>Use the same email address your CAVS administrator approved.</p>
            </div>

            <label><span>Email</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="coach@example.com" autoComplete="email" /></label>

            <button className="authSubmit" type="submit" disabled={sending}>{sending?'Sending…':'Email me a secure link'}</button>

            {error === 'invalid' && <p className="authStatus error">That sign-in link is expired or has already been used. Request a new one below.</p>}
            {status && <p className="authStatus">{status}</p>}
          </form>

          <div className="magicLinkNote">
            <b>How access works</b>
            <p>CAVS approves your email and permissions first. Your sign-in link expires after 15 minutes and works only once.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
