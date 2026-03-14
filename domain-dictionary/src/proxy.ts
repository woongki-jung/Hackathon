import { getIronSession } from 'iron-session';
import { NextRequest, NextResponse } from 'next/server';
import { sessionOptions, type SessionData } from '@/lib/auth/session';

// 인증 없이 접근 가능한 경로 (AUTH-R-012 예외)
const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 공개 경로는 통과
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 정적 파일 및 Next.js 내부 경로 통과
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // iron-session으로 세션 검증 (AUTH-R-012)
  try {
    const session = await getIronSession<SessionData>(request, response, sessionOptions);

    if (!session.userId) {
      // API 요청은 401, 페이지 요청은 로그인으로 리다이렉트
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { success: false, message: '인증이 필요합니다.' },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return response;
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
