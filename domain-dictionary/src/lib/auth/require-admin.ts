import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sessionOptions, type SessionData } from '@/lib/auth/session';

export const runtime = 'nodejs';

/**
 * API 라우트에서 관리자 세션을 검증합니다.
 * 인증 실패 시 NextResponse를 반환하고, 성공 시 SessionData를 반환합니다.
 */
export async function requireAdmin(): Promise<SessionData | NextResponse> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.userId) {
    return NextResponse.json({ success: false, message: '로그인이 필요합니다.' }, { status: 401 });
  }

  if (session.role !== 'admin') {
    return NextResponse.json({ success: false, message: '관리자 권한이 필요합니다.' }, { status: 403 });
  }

  return session as SessionData;
}

/**
 * requireAdmin 결과가 에러 응답인지 확인합니다.
 */
export function isNextResponse(value: SessionData | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
