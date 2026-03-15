import { desc } from 'drizzle-orm';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { terms } from '@/db/schema';
import { sessionOptions, type SessionData } from '@/lib/auth/session';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
// 빈도 트렌드는 5분 캐시 (자주 변경되지 않음)
export const revalidate = 300;

// DICT-002: 빈도 트렌드 상위 10개 용어 조회
export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId) {
    return NextResponse.json({ success: false, message: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const items = db
      .select({
        id: terms.id,
        name: terms.name,
        category: terms.category,
        frequency: terms.frequency,
      })
      .from(terms)
      .orderBy(desc(terms.frequency))
      .limit(10)
      .all();

    logger.info('[api/dictionary/trending] 트렌드 조회', { count: items.length });

    return NextResponse.json({ success: true, data: { items } });
  } catch (err) {
    logger.error('[api/dictionary/trending] 오류', { error: String(err) });
    return NextResponse.json({ success: false, message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
