import { eq } from 'drizzle-orm';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/db';
import { users } from '@/db/schema';
import { sessionOptions, type SessionData } from '@/lib/auth/session';
import { validateUsername } from '@/lib/validators/auth';
import { isRateLimited, getClientIp } from '@/lib/auth/rate-limiter';

// better-sqlite3는 Node.js 런타임 전용
export const runtime = 'nodejs';

export async function POST(request: Request) {
  // Rate limiting: IP당 1분에 10회 제한
  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, message: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body.username !== 'string' || typeof body.password !== 'string') {
      return NextResponse.json(
        { success: false, message: '아이디와 비밀번호를 입력해 주세요.' },
        { status: 400 }
      );
    }

    const { username, password } = body;

    // 서버 측 유효성 검사
    const usernameError = validateUsername(username);
    if (usernameError || password.length < 8) {
      return NextResponse.json(
        { success: false, message: '아이디 또는 비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    // DB에서 사용자 조회 (소프트 삭제 및 비활성 계정 제외)
    const user = db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();

    if (!user || user.deletedAt !== null || user.isActive !== 1) {
      return NextResponse.json(
        { success: false, message: '아이디 또는 비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    // 비밀번호 검증 (AUTH-R-007)
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, message: '아이디 또는 비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    // iron-session 세션 생성 (AUTH-R-009)
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    session.userId = user.id;
    session.username = user.username;
    session.role = user.role as 'admin' | 'user';
    await session.save();

    return NextResponse.json({
      success: true,
      data: { userId: user.id, username: user.username, role: user.role },
      message: '로그인 성공',
    });
  } catch (err) {
    console.error('[api/auth/login]', err);
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
