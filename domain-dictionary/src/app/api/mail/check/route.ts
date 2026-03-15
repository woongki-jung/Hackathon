import { NextResponse } from 'next/server';
import { requireAdmin, isNextResponse } from '@/lib/auth/require-admin';
import { isMailBatchRunning, runMailBatch } from '@/lib/mail/mail-batch';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

// ANAL-TRIGGER-001: 분석 배치 수동 트리거 (admin 전용) / Vercel Cron Jobs 엔드포인트
export async function POST() {
  const authResult = await requireAdmin();
  if (isNextResponse(authResult)) return authResult;

  if (isMailBatchRunning()) {
    return NextResponse.json(
      { success: false, message: '이미 분석이 진행 중입니다.' },
      { status: 409 }
    );
  }

  logger.info('[api/mail/check] 분석 배치 수동 트리거', { userId: authResult.userId });

  // 비동기 실행 — API는 즉시 응답
  runMailBatch().catch((err) => {
    logger.error('[api/mail/check] 배치 실행 오류', { error: String(err) });
  });

  return NextResponse.json({
    success: true,
    message: '분석이 시작되었습니다.',
  });
}
