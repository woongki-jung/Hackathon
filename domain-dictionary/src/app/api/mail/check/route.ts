import { NextResponse } from 'next/server';
import { requireAdmin, isNextResponse } from '@/lib/auth/require-admin';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

// 중복 실행 방지 잠금 (Sprint 5에서 실제 배치로 교체)
let isRunning = false;

// MAIL-002: 수동 메일 확인 트리거 (admin 전용)
export async function POST() {
  const authResult = await requireAdmin();
  if (isNextResponse(authResult)) return authResult;

  if (isRunning) {
    return NextResponse.json(
      { success: false, message: '이미 메일 확인이 진행 중입니다.' },
      { status: 409 }
    );
  }

  logger.info('[api/mail/check] 수동 메일 확인 트리거', { userId: authResult.userId });

  // Sprint 5에서 실제 배치 분석 로직으로 교체 예정
  isRunning = true;
  setTimeout(() => {
    isRunning = false;
    logger.info('[api/mail/check] 메일 확인 완료 (플레이스홀더)');
  }, 2000);

  return NextResponse.json({
    success: true,
    message: '메일 확인이 시작되었습니다.',
  });
}
