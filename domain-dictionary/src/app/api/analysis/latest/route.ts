import { desc, eq } from 'drizzle-orm';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { analysisQueue } from '@/db/schema';
import { sessionOptions, type SessionData } from '@/lib/auth/session';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

// ANAL-001: 최신 완료 분석 결과 1건 조회
export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId) {
    return NextResponse.json({ success: false, message: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const latest = db
      .select({
        id: analysisQueue.id,
        fileName: analysisQueue.fileName,
        mailSubject: analysisQueue.mailSubject,
        mailReceivedAt: analysisQueue.mailReceivedAt,
        status: analysisQueue.status,
        summary: analysisQueue.summary,
        actionItems: analysisQueue.actionItems,
        extractedTermCount: analysisQueue.extractedTermCount,
        analyzedAt: analysisQueue.analyzedAt,
      })
      .from(analysisQueue)
      .where(eq(analysisQueue.status, 'completed'))
      .orderBy(desc(analysisQueue.analyzedAt))
      .limit(1)
      .get();

    logger.info('[api/analysis/latest] 최신 분석 결과 조회', { userId: session.userId });

    return NextResponse.json({
      success: true,
      data: latest ?? null,
    });
  } catch (err) {
    logger.error('[api/analysis/latest] 오류', { err: String(err) });
    return NextResponse.json({ success: false, message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
