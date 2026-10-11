import { NextResponse } from 'next/server';
import { getAccessUsers, saveAccessUsers, readSessionToken, ALL_PERMISSIONS } from '../../lib/accessServer';

function adminFrom(request) {
  const token = request.cookies.get('coachvault_session')?.value || '';
  const session = readSessionToken(token);
  if (!session) return null;
  if (session.role !== 'administrator' && !(session.permissions || []).includes('admin_tools')) return null;
  return session;
}

export async function GET(request) {
  if (!adminFrom(request)) return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  return NextResponse.json({ users:await getAccessUsers(), permissions:ALL_PERMISSIONS });
}

export async function POST(request) {
  if (!adminFrom(request)) return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  const body = await request.json();
  const users = await getAccessUsers();
  const email = String(body.email || '').trim().toLowerCase();
  if (!email) return NextResponse.json({ error:'Email is required.' }, { status:400 });
  if (users.some(u => u.email === email)) return NextResponse.json({ error:'That email is already approved.' }, { status:409 });

  users.push({
    id:crypto.randomUUID(),
    name:String(body.name || '').trim(),
    email,
    role:body.role === 'administrator' ? 'administrator' : 'coach',
    permissions:Array.isArray(body.permissions) ? body.permissions : ['coachvault','practice_builder','team_resources'],
    active:true,
    createdAt:new Date().toISOString()
  });
  const saved = await saveAccessUsers(users);
  return NextResponse.json({ users:saved });
}

export async function PATCH(request) {
  if (!adminFrom(request)) return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  const body = await request.json();
  const users = await getAccessUsers();
  const updated = users.map(u => u.owner || u.id !== body.id ? u : {
    ...u,
    name:body.name ?? u.name,
    role:body.role === 'administrator' ? 'administrator' : (body.role === 'coach' ? 'coach' : u.role),
    permissions:Array.isArray(body.permissions) ? body.permissions : u.permissions,
    active:body.active === undefined ? u.active : Boolean(body.active)
  });
  return NextResponse.json({ users:await saveAccessUsers(updated) });
}

export async function DELETE(request) {
  if (!adminFrom(request)) return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  const id = request.nextUrl.searchParams.get('id');
  const users = await getAccessUsers();
  return NextResponse.json({ users:await saveAccessUsers(users.filter(u => u.owner || u.id !== id)) });
}
