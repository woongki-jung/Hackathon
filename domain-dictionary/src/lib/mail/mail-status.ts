// MAIL-PROC-002: 메일 상태 갱신 (SEEN 플래그 + 처리 로그 기록)
import { ImapFlow } from 'imapflow';
import { db } from '@/db';
import { mailProcessingLogs } from '@/db/schema';
import { getSetting } from '@/lib/config/settings-service';
import { logger } from '@/lib/logger';

/**
 * IMAP 서버에서 처리 완료된 메일 UID에 SEEN 플래그를 설정합니다.
 */
export async function markMailsAsSeen(uids: number[]): Promise<void> {
  if (uids.length === 0) return;

  const host = await getSetting('mail.imap.host');
  const portStr = await getSetting('mail.imap.port');
  const username = await getSetting('mail.imap.username');
  const useSslStr = await getSetting('mail.imap.use_ssl');
  const password = process.env.MAIL_PASSWORD;

  if (!host || !portStr || !username || !password) return;

  try {
    const client = new ImapFlow({
      host,
      port: Number(portStr),
      secure: useSslStr !== 'false',
      auth: { user: username, pass: password },
      logger: false,
      connectionTimeout: 10000,
    });

    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      await client.messageFlagsAdd(uids.map(String).join(','), ['\\Seen']);
      logger.info('[mail-status] SEEN 플래그 설정', { uids });
    } finally {
      lock.release();
      await client.logout();
    }
  } catch (err) {
    logger.warn('[mail-status] SEEN 플래그 설정 실패', { error: String(err) });
  }
}

/**
 * mail_processing_logs 테이블에 처리 이력을 기록합니다.
 */
export function recordProcessingLog(params: {
  processType: string;
  status: string;
  mailCount: number;
  analyzedCount: number;
  errorMessage?: string;
}): void {
  const now = new Date().toISOString();
  db.insert(mailProcessingLogs)
    .values({
      executedAt: now,
      completedAt: now,
      processType: params.processType,
      status: params.status,
      mailCount: params.mailCount,
      analyzedCount: params.analyzedCount,
      errorMessage: params.errorMessage ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  logger.info('[mail-status] 처리 로그 기록', params);
}
