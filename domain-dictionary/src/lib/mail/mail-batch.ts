// 분석 배치 오케스트레이션 (웹훅 수신 후 분석 파이프라인 실행)
import { db } from '@/db';
import { mailProcessingLogs } from '@/db/schema';
import { cleanupExpiredLogs } from '@/lib/data/cleanup';
import { runBatchAnalysis } from '@/lib/analysis/batch-analyzer';
import { logger } from '@/lib/logger';

// 중복 실행 방지 잠금 (모듈 레벨 — API route와 스케줄러 공유)
let isRunning = false;

export function isMailBatchRunning(): boolean {
  return isRunning;
}

/**
 * 분석 배치를 실행합니다.
 * - analysis_queue의 pending 항목을 분석 파이프라인으로 처리
 * - 만료 파일/로그 정리
 */
export async function runMailBatch(): Promise<void> {
  if (isRunning) {
    logger.warn('[mail-batch] 이미 실행 중 — 건너뜀');
    return;
  }

  isRunning = true;
  const startedAt = new Date().toISOString();
  logger.info('[mail-batch] 배치 시작');

  let analyzedCount = 0;
  let errorMessage: string | undefined;

  try {
    // 분석 파이프라인
    const { analyzed, failed } = await runBatchAnalysis();
    analyzedCount = analyzed;
    logger.info('[mail-batch] 분석 파이프라인 완료', { analyzed, failed });

    // 만료 로그 정리
    await cleanupExpiredLogs();

    logger.info('[mail-batch] 배치 완료', { analyzed });
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('[mail-batch] 배치 오류', { error: errorMessage });
  } finally {
    // 처리 이력 기록
    const now = new Date().toISOString();
    await db.insert(mailProcessingLogs)
      .values({
        executedAt: startedAt,
        completedAt: now,
        processType: 'analysis',
        status: errorMessage ? 'failed' : 'success',
        mailCount: 0,
        analyzedCount,
        errorMessage: errorMessage ?? null,
        createdAt: now,
        updatedAt: now,
      });

    isRunning = false;
    logger.info('[mail-batch] 배치 종료', { startedAt, endedAt: now });
  }
}
