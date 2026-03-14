// DATA-FILE-002: 만료 파일/로그 정리
import { lt } from 'drizzle-orm';
import { db } from '@/db';
import { mailProcessingLogs } from '@/db/schema';
import { listFiles, getFileMtimeMs, deleteFile } from '@/lib/fs/file-manager';
import { logger } from '@/lib/logger';

const MAILS_DIR = process.env.MAIL_STORAGE_PATH ?? './data/mails';
const MAIL_FILE_TTL_MS = 30 * 24 * 60 * 60 * 1000;  // 30일
const LOG_TTL_MS = 90 * 24 * 60 * 60 * 1000;         // 90일

/**
 * 30일 경과된 메일 임시 파일을 삭제합니다.
 */
export function cleanupExpiredMailFiles(): void {
  const now = Date.now();
  const files = listFiles(MAILS_DIR);
  let deleted = 0;

  for (const filePath of files) {
    const mtime = getFileMtimeMs(filePath);
    if (mtime !== null && now - mtime > MAIL_FILE_TTL_MS) {
      deleteFile(filePath);
      deleted++;
    }
  }

  if (deleted > 0) {
    logger.info('[cleanup] 만료 메일 파일 삭제', { deleted });
  }
}

/**
 * 90일 경과된 mail_processing_logs를 하드 삭제합니다.
 */
export function cleanupExpiredLogs(): void {
  const cutoff = new Date(Date.now() - LOG_TTL_MS).toISOString();

  const result = db
    .delete(mailProcessingLogs)
    .where(lt(mailProcessingLogs.createdAt, cutoff))
    .run();

  if (result.changes > 0) {
    logger.info('[cleanup] 만료 처리 로그 삭제', { deleted: result.changes });
  }
}
