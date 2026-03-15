// SCHED-001: 백그라운드 스케줄러
import cron, { type ScheduledTask } from 'node-cron';
import { runBatchAnalysis } from '@/lib/analysis/batch-analyzer';
import { logger } from '@/lib/logger';

// HMR 중복 방지를 위한 전역 싱글톤
declare global {
  var __scheduler: ScheduledTask | undefined;
}

/**
 * 스케줄러를 초기화하고 시작합니다.
 * - 매 시간 0분에 분석 배치 실행
 * - HMR 재시작 시 기존 태스크를 종료 후 재생성
 */
export async function initScheduler(): Promise<void> {
  // 기존 스케줄러 종료
  if (global.__scheduler) {
    global.__scheduler.stop();
    global.__scheduler = undefined;
    logger.info('[scheduler] 기존 스케줄러 종료');
  }

  // 매 시간 0분 실행
  const cronExpr = '0 * * * *';
  logger.info('[scheduler] 스케줄러 시작', { cronExpr });

  global.__scheduler = cron.schedule(cronExpr, async () => {
    logger.info('[scheduler] 주기 실행 트리거');
    await runBatchAnalysis();
  });
}

/**
 * 스케줄러가 활성화되어 있는지 반환합니다.
 */
export function isSchedulerRunning(): boolean {
  return !!global.__scheduler;
}

/**
 * 애플리케이션 종료 시 스케줄러를 정리합니다.
 */
export function stopScheduler(): void {
  if (global.__scheduler) {
    global.__scheduler.stop();
    global.__scheduler = undefined;
    logger.info('[scheduler] 스케줄러 정지');
  }
}
