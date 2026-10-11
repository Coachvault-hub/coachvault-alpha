'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const permissionOptions = [
  ['coachvault','CoachVault'],
  ['practice_builder','Practice Builder'],
  ['team_resources','Team Resources'],
  ['club_documents','Club Documents'],
  ['admin_tools','Admin Tools']
];

export default function AccessPage() {
  const [users,setUsers] = useState([]);
  const [name,setName] = useState('');
  const [email,setEmail] = useState('');
  const [role,setRole] = useState('coach');
  const [permissions,setPermissions] = useState(['coachvault','practice_builder','team_resources']);
  const [status,setStatus] = useState('');

  async function load() {
    const res = await fetch('/api/access',{cache:'no-store'});
    if (!res.ok) { setStatus('You do not have permission to manage coach access.'); return; }
    const data = await res.json();
    setUsers(data.users || []);
  }

  useEffect(()=>{ load(); },[]);

  function togglePermission(key) {
    setPermissions(current => current.includes(key) ? current.filter(x=>x!==key) : [...current,key]);
  }

  async function addUser(e) {
    e.preventDefault();
    setStatus('Saving…');
    const res = await fetch('/api/access',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name,email,role,permissions})
    });
    const data = await res.json();
    if (!res.ok) { setStatus(data.error || 'Could not approve access.'); return; }
    setUsers(data.users || []);
    setName(''); setEmail(''); setRole('coach');
    setPermissions(['coachvault','practice_builder','team_resources']);
    setStatus('Access approved.');
  }

  async function updateUser(user,patch) {
    const res = await fetch('/api/access',{
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:user.id,...patch})
    });
    const data = await res.json();
    if (res.ok) setUsers(data.users || []);
  }

  async function removeUser(user) {
    if (user.owner) return;
    const res = await fetch('/api/access?id='+encodeURIComponent(user.id),{method:'DELETE'});
    const data = await res.json();
    if (res.ok) setUsers(data.users || []);
  }

  return <main className="accessPage">
    <header className="accessTop">
      <Link href="/workspace">← CoachVault</Link>
      <div><small>CAVS LACROSSE CLUB</small><h1>Coach Access</h1><p>Approve coaches by email and choose exactly what they can use.</p></div>
    </header>

    <section className="accessNote">
      <b>Email-link sign in</b>
      <p>Approved coaches enter their email on the login page. CoachVault sends a single-use sign-in link that expires in 15 minutes. No ChatGPT account and no shared password.</p>
    </section>

    <section className="accessUsers">
      {users.map(user=><article key={user.id}>
        <div><strong>{user.name || user.email}</strong><span>{user.email}</span><small>{user.owner?'Club owner':user.role}</small></div>
        <div className="accessUserPermissions">{(user.permissions||[]).map(p=><span key={p}>{permissionOptions.find(x=>x[0]===p)?.[1]||p}</span>)}</div>
        {!user.owner && <div className="accessUserActions">
          <select value={user.role} onChange={e=>updateUser(user,{role:e.target.value})}><option value="coach">Coach</option><option value="administrator">Administrator</option></select>
          <button onClick={()=>updateUser(user,{active:!user.active})}>{user.active?'Disable':'Enable'}</button>
          <button className="danger" onClick={()=>removeUser(user)}>Remove</button>
        </div>}
      </article>)}
    </section>

    <form className="accessInvite" onSubmit={addUser}>
      <span>ADD COACH OR ADMINISTRATOR</span>
      <h2>Approve access</h2>
      <label><b>Name</b><input value={name} onChange={e=>setName(e.target.value)} required placeholder="Coach name" /></label>
      <label><b>Email</b><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="coach@example.com" /></label>
      <label><b>Role</b><select value={role} onChange={e=>setRole(e.target.value)}><option value="coach">Coach</option><option value="administrator">Administrator</option></select></label>
      <fieldset>
        <legend>Permissions</legend>
        {permissionOptions.map(([key,label])=><label className="permissionCheck" key={key}><input type="checkbox" checked={permissions.includes(key)} onChange={()=>togglePermission(key)} /><span>{label}</span></label>)}
      </fieldset>
      <button type="submit">Approve access +</button>
      {status && <p className="accessStatus">{status}</p>}
    </form>
  </main>
}
