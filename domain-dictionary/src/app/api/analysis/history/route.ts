import { desc } from 'drizzle-orm';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { analysisQueue } from '@/db/schema';
import { sessionOptions, type SessionData } from '@/lib/auth/session';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const PAGE_SIZE = 10;

// ANAL-002: 분석 이력 목록 조회 (페이지네이션, 최신순)
export async function GET(request: Request) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId) {
    return NextResponse.json({ success: false, message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  try {
    const items = db
      .select({
        id: analysisQueue.id,
        fileName: analysisQueue.fileName,
        sourceDescription: analysisQueue.sourceDescription,
        receivedAt: analysisQueue.receivedAt,
        status: analysisQueue.status,
        extractedTermCount: analysisQueue.extractedTermCount,
        analyzedAt: analysisQueue.analyzedAt,
        retryCount: analysisQueue.retryCount,
        errorMessage: analysisQueue.errorMessage,
        createdAt: analysisQueue.createdAt,
      })
      .from(analysisQueue)
      .orderBy(desc(analysisQueue.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset)
      .all();

    // 전체 건수 조회
    const total = (db.select({ id: analysisQueue.id }).from(analysisQueue).all()).length;

    logger.info('[api/analysis/history] 분석 이력 조회', { userId: session.userId, page });

    return NextResponse.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          pageSize: PAGE_SIZE,
          total,
          totalPages: Math.ceil(total / PAGE_SIZE),
        },
      },
    });
  } catch (err) {
    logger.error('[api/analysis/history] 오류', { err: String(err) });
    return NextResponse.json({ success: false, message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
