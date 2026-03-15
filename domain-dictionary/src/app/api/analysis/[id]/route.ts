import { eq } from 'drizzle-orm';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { analysisQueue, termSourceFiles, terms } from '@/db/schema';
import { sessionOptions, type SessionData } from '@/lib/auth/session';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

// ANAL-003: 분석 상세 조회 (업무지원 상세)
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
    const item = db.select().from(analysisQueue).where(eq(analysisQueue.id, id)).get();

    if (!item) {
      return NextResponse.json({ success: false, message: '분석 항목을 찾을 수 없습니다.' }, { status: 404 });
    }

    // fileName으로 연결된 용어 목록 조회
    const extractedTerms = db
      .select({
        id: terms.id,
        name: terms.name,
        category: terms.category,
      })
      .from(termSourceFiles)
      .innerJoin(terms, eq(termSourceFiles.termId, terms.id))
      .where(eq(termSourceFiles.sourceFileName, item.fileName))
      .all();

    logger.info('[api/analysis/:id] 분석 상세 조회', { id, userId: session.userId });

    return NextResponse.json({
      success: true,
      data: { item, extractedTerms },
    });
  } catch (err) {
    logger.error('[api/analysis/:id] 오류', { error: String(err) });
    return NextResponse.json({ success: false, message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
