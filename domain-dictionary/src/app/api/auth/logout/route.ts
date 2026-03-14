import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sessionOptions, type SessionData } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.destroy();

  return NextResponse.json({ success: true, data: null, message: '로그아웃 완료' });
}
