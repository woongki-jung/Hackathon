// DATA-FILE-002: 만료 로그 정리
import { lt } from 'drizzle-orm';
import { db } from '@/db';
import { mailProcessingLogs } from '@/db/schema';
import { logger } from '@/lib/logger';

const LOG_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90일

/**
 * 90일 경과된 mail_processing_logs를 하드 삭제합니다.
 */
export async function cleanupExpiredLogs(): Promise<void> {
  const cutoff = new Date(Date.now() - LOG_TTL_MS).toISOString();

  const result = await db
    .delete(mailProcessingLogs)
    .where(lt(mailProcessingLogs.createdAt, cutoff));

  const changes = (result as { rowsAffected?: number })?.rowsAffected ?? 0;
  if (changes > 0) {
    logger.info('[cleanup] 만료 처리 로그 삭제', { deleted: changes });
  }
}
