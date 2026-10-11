import { NextResponse } from 'next/server';

function b64urlToBytes(value) {
  const padded = value.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4 - value.length % 4) % 4);
  const raw = atob(padded);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

function decodePayload(body) {
  try {
    return JSON.parse(new TextDecoder().decode(b64urlToBytes(body)));
  } catch (_) {
    return null;
  }
}

async function verifySession(token) {
  const secret = process.env.COACHVAULT_AUTH_SECRET || '';
  if (!secret || !token || !token.includes('.')) return null;
  const [body,sig] = token.split('.');
  const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const ok = await crypto.subtle.verify('HMAC',key,b64urlToBytes(sig),new TextEncoder().encode(body));
  if (!ok) return null;
  const payload = decodePayload(body);
  if (!payload || payload.type !== 'session' || (payload.exp && Date.now() > payload.exp)) return null;
  return payload;
}

export async function middleware(request) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get('coachvault_session')?.value || '';
  const session = await verifySession(token);
  if (!session) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', path);
    return NextResponse.redirect(login);
  }

  const perms = session.permissions || [];
  if (path.startsWith('/workspace') && !perms.includes('coachvault')) return NextResponse.redirect(new URL('/roadmap',request.url));
  if (path.startsWith('/access') && session.role !== 'administrator' && !perms.includes('admin_tools')) return NextResponse.redirect(new URL('/workspace',request.url));
  return NextResponse.next();
}

export const config = { matcher:['/workspace/:path*','/roadmap/:path*','/access/:path*'] };
