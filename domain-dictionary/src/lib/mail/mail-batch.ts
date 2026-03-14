// 메일 수신 배치 오케스트레이션 (T5-3~T5-8 통합)
import { receiveMails } from './imap-receiver';
import { saveAnalysisFile } from '@/lib/data/analysis-file';
import { markMailsAsSeen, recordProcessingLog } from './mail-status';
import { cleanupExpiredMailFiles, cleanupExpiredLogs } from '@/lib/data/cleanup';
import { logger } from '@/lib/logger';

// 중복 실행 방지 잠금 (모듈 레벨 — API route와 스케줄러 공유)
let isRunning = false;

export function isMailBatchRunning(): boolean {
  return isRunning;
}

/**
 * 메일 수신 배치를 실행합니다.
 * Phase 1: 메일 수신 → 파일 저장 → 큐 등록
 * Phase 2: SEEN 플래그 설정 (Sprint 6 분석 파이프라인 연동 예정)
 * Phase 3: 만료 파일/로그 정리
 */
export async function runMailBatch(): Promise<void> {
  if (isRunning) {
    logger.warn('[mail-batch] 이미 실행 중 — 건너뜀');
    return;
  }

  isRunning = true;
  const startedAt = new Date().toISOString();
  logger.info('[mail-batch] 배치 시작');

  let mailCount = 0;
  let errorMessage: string | undefined;

  try {
    // Phase 1: 메일 수신 및 큐 등록
    const mails = await receiveMails();
    mailCount = mails.length;

    const processedUids: number[] = [];
    for (const mail of mails) {
      try {
        saveAnalysisFile(mail.fileName, mail.textBody, mail.subject, mail.receivedAt);
        processedUids.push(mail.uid);
      } catch (err) {
        logger.warn('[mail-batch] 메일 파일 저장 실패', { uid: mail.uid, error: String(err) });
      }
    }

    // Phase 2: 처리된 메일 SEEN 플래그 설정
    if (processedUids.length > 0) {
      await markMailsAsSeen(processedUids);
    }

    // Phase 3: 정리
    cleanupExpiredMailFiles();
    cleanupExpiredLogs();

    logger.info('[mail-batch] 배치 완료', { mailCount, processedUids: processedUids.length });
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('[mail-batch] 배치 오류', { error: errorMessage });
  } finally {
    // 처리 이력 기록
    recordProcessingLog({
      processType: 'mail_receive',
      status: errorMessage ? 'failed' : 'success',
      mailCount,
      analyzedCount: 0,
      errorMessage,
    });

    isRunning = false;
    logger.info('[mail-batch] 배치 종료', { startedAt, endedAt: new Date().toISOString() });
  }
}
