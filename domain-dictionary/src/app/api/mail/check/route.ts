import { NextResponse } from 'next/server';
import { requireAdmin, isNextResponse } from '@/lib/auth/require-admin';
import { runBatchAnalysis } from '@/lib/analysis/batch-analyzer';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

// ANAL-TRIGGER-001: 미완료 항목 재분석 수동 트리거 (admin 전용)
export async function POST() {
  const authResult = await requireAdmin();
  if (isNextResponse(authResult)) return authResult;

  logger.info('[api/mail/check] 재분석 배치 수동 트리거', { userId: authResult.userId });

  // 비동기 실행 — API는 즉시 응답
  runBatchAnalysis().catch((err) => {
    logger.error('[api/mail/check] 배치 실행 오류', { error: String(err) });
  });

  return NextResponse.json({
    success: true,
    message: '미완료 항목 재분석이 시작되었습니다.',
  });
}
