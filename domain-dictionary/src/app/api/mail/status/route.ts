import { count, desc } from 'drizzle-orm';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mailProcessingLogs, webhooks } from '@/db/schema';
import { sessionOptions, type SessionData } from '@/lib/auth/session';
import { getAllSettings } from '@/lib/config/settings-service';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

// MAIL-001: 서비스 상태 조회 (인증된 모든 사용자 접근 가능)
export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId) {
    return NextResponse.json({ success: false, message: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const settings = await getAllSettings();

    // 최근 실행 로그 조회
    const [recentLog] = await db
      .select()
      .from(mailProcessingLogs)
      .orderBy(desc(mailProcessingLogs.executedAt))
      .limit(1);

    // 등록된 웹훅 수 조회
    const [webhookCountResult] = await db.select({ value: count() }).from(webhooks);
    const webhookCount = webhookCountResult?.value ?? 0;

    logger.info('[api/mail/status] 서비스 상태 조회', { userId: session.userId });

    return NextResponse.json({
      success: true,
      data: {
        webhook: {
          count: webhookCount,
        },
        lastRunAt: recentLog?.executedAt ?? null,
        lastRunStatus: recentLog?.status ?? null,
        lastRunAnalyzedCount: recentLog?.analyzedCount ?? null,
        analysis: {
          apiKeyConfigured: !!process.env.GEMINI_API_KEY,
          model: settings['analysis.model'] ?? null,
        },
      },
    });
  } catch (err) {
    logger.error('[api/mail/status] 오류', { err: String(err) });
    return NextResponse.json({ success: false, message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
