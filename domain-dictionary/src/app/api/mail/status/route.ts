import { desc } from 'drizzle-orm';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mailProcessingLogs } from '@/db/schema';
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
    const recentLog = db
      .select()
      .from(mailProcessingLogs)
      .orderBy(desc(mailProcessingLogs.executedAt))
      .limit(1)
      .get();

    logger.info('[api/mail/status] 서비스 상태 조회', { userId: session.userId });

    return NextResponse.json({
      success: true,
      data: {
        scheduler: {
          // 스케줄러는 Sprint 5에서 구현 예정 — 현재는 항상 stopped
          status: 'stopped' as const,
          checkInterval: settings['mail.check_interval'] ? Number(settings['mail.check_interval']) : null,
        },
        mail: {
          imapConfigured: !!(settings['mail.imap.host'] && settings['mail.imap.port']),
          passwordConfigured: !!process.env.MAIL_PASSWORD,
          lastRunAt: recentLog?.executedAt ?? null,
          lastRunStatus: recentLog?.status ?? null,
          lastRunMailCount: recentLog?.mailCount ?? null,
        },
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
