import { NextResponse } from 'next/server';
import { consumeMagicToken, createSessionToken } from '../../../lib/accessServer';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const token = request.nextUrl.searchParams.get('token') || '';
  const user = await consumeMagicToken(token);
  if (!user) return NextResponse.redirect(new URL('/login?error=invalid', request.url));

  const session = createSessionToken(user);
  const destination = user.permissions?.includes('coachvault') ? '/workspace' : '/roadmap';
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.set('coachvault_session', session, {
    httpOnly:true,
    secure:true,
    sameSite:'lax',
    path:'/',
    maxAge:7 * 24 * 60 * 60
  });
  return response;
}
