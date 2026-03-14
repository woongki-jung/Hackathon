// SCHED-001: 백그라운드 스케줄러
import cron, { type ScheduledTask } from 'node-cron';
import { getSetting } from '@/lib/config/settings-service';
import { runMailBatch } from '@/lib/mail/mail-batch';
import { logger } from '@/lib/logger';

// HMR 중복 방지를 위한 전역 싱글톤
declare global {
  var __scheduler: ScheduledTask | undefined;
}

/**
 * 스케줄러를 초기화하고 시작합니다.
 * - 서버 시작 시 최초 1회 즉시 실행
 * - DB 설정 기반 주기적 실행 (기본 1시간)
 * - HMR 재시작 시 기존 태스크를 종료 후 재생성
 */
export async function initScheduler(): Promise<void> {
  // 기존 스케줄러 종료
  if (global.__scheduler) {
    global.__scheduler.stop();
    global.__scheduler = undefined;
    logger.info('[scheduler] 기존 스케줄러 종료');
  }

  // 확인 주기 조회 (기본 1시간)
  const intervalMsStr = await getSetting('mail.check_interval');
  const intervalMs = intervalMsStr ? Number(intervalMsStr) : 3_600_000;
  const intervalMin = Math.max(1, Math.round(intervalMs / 60_000));

  // cron 표현식: 매 N분
  const cronExpr = `*/${intervalMin} * * * *`;
  logger.info('[scheduler] 스케줄러 시작', { cronExpr, intervalMin });

  global.__scheduler = cron.schedule(cronExpr, async () => {
    logger.info('[scheduler] 주기 실행 트리거');
    await runMailBatch();
  });

  // 최초 1회 즉시 실행 (서버 시작 시)
  logger.info('[scheduler] 최초 1회 즉시 실행');
  runMailBatch().catch((err) => {
    logger.error('[scheduler] 최초 실행 오류', { error: String(err) });
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
