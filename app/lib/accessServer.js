import crypto from 'crypto';
import { get, put, del } from '@vercel/blob';

const ACCESS_PATH = 'coachvault-access/users.json';
const ALL_PERMISSIONS = ['coachvault','practice_builder','team_resources','club_documents','admin_tools'];

function blobToken() {
  return process.env.COACHVAULT_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN || '';
}

function ownerEmail() {
  return String(process.env.COACHVAULT_OWNER_EMAIL || 'jbbirdusmc@gmail.com').trim().toLowerCase();
}

async function streamToText(stream) {
  if (!stream) return '';
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

async function readJsonBlob(pathname, fallback) {
  const token = blobToken();
  if (!token) return fallback;
  try {
    const result = await get(pathname, { token, access:'private', useCache:false });
    if (!result?.stream) return fallback;
    const text = await streamToText(result.stream);
    return text ? JSON.parse(text) : fallback;
  } catch (_) {
    return fallback;
  }
}

async function writeJsonBlob(pathname, value) {
  const token = blobToken();
  if (!token) throw new Error('CoachVault Blob token is not configured.');
  await put(pathname, JSON.stringify(value, null, 2), {
    token,
    access:'private',
    contentType:'application/json',
    allowOverwrite:true
  });
}

export async function getAccessUsers() {
  const users = await readJsonBlob(ACCESS_PATH, []);
  const owner = ownerEmail();
  const withoutOwner = (Array.isArray(users) ? users : []).filter(u => String(u.email || '').toLowerCase() !== owner);
  return [
    {
      id:'club-owner',
      name:'Jordan Bird',
      email:owner,
      role:'administrator',
      permissions:ALL_PERMISSIONS,
      active:true,
      owner:true,
      createdAt:'bootstrap'
    },
    ...withoutOwner
  ];
}

export async function saveAccessUsers(users) {
  const owner = ownerEmail();
  const clean = (users || [])
    .filter(u => String(u.email || '').toLowerCase() !== owner)
    .map(u => ({
      id:u.id || crypto.randomUUID(),
      name:String(u.name || '').trim(),
      email:String(u.email || '').trim().toLowerCase(),
      role:u.role === 'administrator' ? 'administrator' : 'coach',
      permissions:Array.from(new Set((u.permissions || []).filter(p => ALL_PERMISSIONS.includes(p)))),
      active:u.active !== false,
      createdAt:u.createdAt || new Date().toISOString()
    }));
  await writeJsonBlob(ACCESS_PATH, clean);
  return getAccessUsers();
}

export async function findApprovedUser(email) {
  const normalized = String(email || '').trim().toLowerCase();
  const users = await getAccessUsers();
  return users.find(u => u.active !== false && u.email === normalized) || null;
}

export function signPayload(payload) {
  const secret = process.env.COACHVAULT_AUTH_SECRET || '';
  if (!secret) throw new Error('COACHVAULT_AUTH_SECRET is not configured.');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return body + '.' + sig;
}

export function verifyPayload(token) {
  const secret = process.env.COACHVAULT_AUTH_SECRET || '';
  if (!secret || !token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a,b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (_) {
    return null;
  }
}

export async function createMagicToken(user) {
  const nonce = crypto.randomUUID();
  const exp = Date.now() + 15 * 60 * 1000;
  const token = signPayload({ type:'magic', nonce, email:user.email, exp });
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  await writeJsonBlob('coachvault-access/tokens/' + hash + '.json', {
    email:user.email,
    nonce,
    exp,
    createdAt:new Date().toISOString()
  });
  return token;
}

export async function consumeMagicToken(token) {
  const payload = verifyPayload(token);
  if (!payload || payload.type !== 'magic') return null;
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const pathname = 'coachvault-access/tokens/' + hash + '.json';
  const record = await readJsonBlob(pathname, null);
  if (!record || record.email !== payload.email || record.nonce !== payload.nonce || Date.now() > record.exp) return null;
  try { await del(pathname, { token:blobToken() }); } catch (_) {}
  return findApprovedUser(payload.email);
}

export function createSessionToken(user) {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  return signPayload({
    type:'session',
    id:user.id,
    email:user.email,
    name:user.name,
    role:user.role,
    permissions:user.permissions || [],
    exp
  });
}

export function readSessionToken(token) {
  const payload = verifyPayload(token);
  return payload?.type === 'session' ? payload : null;
}

export { ALL_PERMISSIONS };
