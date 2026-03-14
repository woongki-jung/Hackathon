import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sessionOptions, type SessionData } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.userId) {
    return NextResponse.json(
      { success: false, message: '인증이 필요합니다.' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      userId: session.userId,
      username: session.username,
      role: session.role,
    },
  });
}
