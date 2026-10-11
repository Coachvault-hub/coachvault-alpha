import { NextResponse } from 'next/server';
import { createMagicToken, findApprovedUser } from '../../../lib/accessServer';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { email } = await request.json();
    const user = await findApprovedUser(email);
    if (!user) {
      return NextResponse.json({ ok:true, message:'If this email is approved, a sign-in link will be sent.' });
    }

    const token = await createMagicToken(user);
    const origin = request.nextUrl.origin;
    const magicUrl = origin + '/api/auth/verify?token=' + encodeURIComponent(token);

    const apiKey = process.env.RESEND_API_KEY || '';
    const from = process.env.COACHVAULT_EMAIL_FROM || '';
    if (!apiKey || !from) {
      return NextResponse.json({ error:'Coach access email is not configured yet.' }, { status:500 });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method:'POST',
      headers:{
        'Authorization':'Bearer ' + apiKey,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        from,
        to:[user.email],
        subject:'Your CAVS Coach Hub sign-in link',
        html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
          <h2 style="margin:0 0 12px">CAVS Lacrosse Club</h2>
          <p>Hi ${user.name || 'Coach'},</p>
          <p>Use the button below to sign in to the CAVS Coach Hub. This link expires in 15 minutes and can only be used once.</p>
          <p style="margin:28px 0"><a href="${magicUrl}" style="background:#111;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;display:inline-block">Open Coach Hub</a></p>
          <p style="color:#667;font-size:12px">If you did not request this link, you can ignore this email.</p>
        </div>`
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Resend error', detail);
      return NextResponse.json({ error:'CoachVault could not send the sign-in email.' }, { status:502 });
    }

    return NextResponse.json({ ok:true, message:'Check your email for a sign-in link.' });
  } catch (error) {
    return NextResponse.json({ error:error?.message || 'Unable to send sign-in link.' }, { status:500 });
  }
}
