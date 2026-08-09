'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DEMO_DIRECTOR,
  DEMO_COACH,
  getSupabaseClient,
  hasSupabaseConfig,
  saveDemoSession,
  getCurrentCoachVaultSession
} from '../lib/coachvaultAuth';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [status, setStatus] = useState('');
  const configured = hasSupabaseConfig();

  useEffect(() => {
    getCurrentCoachVaultSession().then(session => {
      if (session?.user) router.replace('/roadmap');
    });
  }, [router]);

  async function submit(e) {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) {
      setStatus('Supabase is not connected yet. Use one of the demo roles below, or add the two NEXT_PUBLIC_SUPABASE environment variables.');
      return;
    }

    setStatus(mode === 'signin' ? 'Signing in…' : 'Creating account…');

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return setStatus(error.message);
      router.push('/roadmap');
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options:{ data:{ full_name:fullName, organization_name:organizationName } }
    });
    if (error) return setStatus(error.message);

    if (data.user) {
      await supabase.from('profiles').upsert({
        id:data.user.id,
        email,
        full_name:fullName,
        role:'director'
      });
    }
    setStatus('Account created. If email confirmation is enabled, confirm your email and then sign in.');
    setMode('signin');
  }

  function demo(user) {
    saveDemoSession(user);
    router.push('/roadmap');
  }

  return (
    <main className="authPage">
      <section className="authBrandPanel">
        <Link href="/" className="authBrand">
          <span>CV</span>
          <div><strong>CoachVault</strong><small>Coaching knowledge, organized.</small></div>
        </Link>
        <div className="authMessage">
          <span>COACH & CLUB ACCESS</span>
          <h1>Your season. Your knowledge. One place.</h1>
          <p>Sign in to access your club roadmap, required forms, coaching resources, Vault, practices, and calendar.</p>
          <div className="authFeatureList">
            <div><b>01</b><span>Complete club forms and season tasks</span></div>
            <div><b>02</b><span>Access the coaching resources assigned to you</span></div>
            <div><b>03</b><span>Build practices from your CoachVault knowledge</span></div>
          </div>
        </div>
      </section>

      <section className="authFormPanel">
        <div className="authFormWrap">
          <div className="authFormHeader">
            <Link href="/">← Home</Link>
            <span className={`authConnection ${configured?'ready':'demo'}`}>
              {configured ? 'Supabase connected' : 'Demo mode'}
            </span>
          </div>

          <div className="authTabs">
            <button className={mode==='signin'?'active':''} onClick={()=>setMode('signin')}>Sign In</button>
            <button className={mode==='signup'?'active':''} onClick={()=>setMode('signup')}>Create Club Account</button>
          </div>

          <form className="authForm" onSubmit={submit}>
            <div>
              <small>{mode==='signin'?'WELCOME BACK':'GET STARTED'}</small>
              <h2>{mode==='signin'?'Sign in to CoachVault':'Create your club workspace'}</h2>
              <p>{mode==='signin'?'Access your roadmap and coaching workspace.':'The first account becomes the club director.'}</p>
            </div>

            {mode==='signup' && (
              <>
                <label><span>Your name</span><input value={fullName} onChange={e=>setFullName(e.target.value)} required placeholder="Jordan Bird" /></label>
                <label><span>Club / program name</span><input value={organizationName} onChange={e=>setOrganizationName(e.target.value)} required placeholder="South Carroll Select" /></label>
              </>
            )}

            <label><span>Email</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="coach@club.org" /></label>
            <label><span>Password</span><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} /></label>

            <button className="authSubmit" type="submit">{mode==='signin'?'Sign In':'Create Account'}</button>
            {status && <p className="authStatus">{status}</p>}
          </form>

          {!configured && (
            <div className="demoAccess">
              <span>DEMO ACCESS</span>
              <p>Use these while we connect the real club database.</p>
              <button onClick={()=>demo(DEMO_DIRECTOR)}><b>Director Demo</b><small>Build roadmap + forms + view responses</small></button>
              <button onClick={()=>demo(DEMO_COACH)}><b>Coach Demo</b><small>Complete assigned roadmap items + forms</small></button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
