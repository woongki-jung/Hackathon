import { eq } from 'drizzle-orm';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { terms, termSourceFiles } from '@/db/schema';
import { sessionOptions, type SessionData } from '@/lib/auth/session';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

// DICT-003: 용어 상세 조회 (용어 정보 + 출처 메일 최신순 10건)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId) {
    return NextResponse.json({ success: false, message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const [term] = await db.select().from(terms).where(eq(terms.id, id));

    if (!term) {
      return NextResponse.json({ success: false, message: '용어를 찾을 수 없습니다.' }, { status: 404 });
    }

    const sourcesRaw = await db
      .select({
        id: termSourceFiles.id,
        sourceFileName: termSourceFiles.sourceFileName,
        sourceDescription: termSourceFiles.sourceDescription,
        receivedAt: termSourceFiles.receivedAt,
        createdAt: termSourceFiles.createdAt,
      })
      .from(termSourceFiles)
      .where(eq(termSourceFiles.termId, id))
      .orderBy(termSourceFiles.receivedAt)
      .limit(10);

    const sources = sourcesRaw.reverse(); // 최신순

    logger.info('[api/dictionary/terms/:id] 용어 상세 조회', { id });

    return NextResponse.json({
      success: true,
      data: { term, sources },
    });
  } catch (err) {
    logger.error('[api/dictionary/terms/:id] 오류', { error: String(err) });
    return NextResponse.json({ success: false, message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
