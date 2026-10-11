import { NextResponse } from 'next/server';
import { readSessionToken } from '../../../lib/accessServer';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const token = request.cookies.get('coachvault_session')?.value || '';
  const session = readSessionToken(token);
  if (!session) return NextResponse.json({ user:null }, { status:401 });
  return NextResponse.json({
    user:{
      id:session.id,
      email:session.email,
      full_name:session.name,
      role:session.role,
      permissions:session.permissions || [],
      organization_id:'cavs-lacrosse-club'
    },
    organization:{ id:'cavs-lacrosse-club', name:'CAVS Lacrosse Club', slug:'cavs-lacrosse-club' }
  });
}

export async function DELETE() {
  const response = NextResponse.json({ ok:true });
  response.cookies.set('coachvault_session','',{ httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:0 });
  return response;
}
