// DATA-FILE-001: 분석 요청 파일 생성 및 analysis_queue 등록
import path from 'path';
import { db } from '@/db';
import { analysisQueue } from '@/db/schema';
import { writeFile } from '@/lib/fs/file-manager';
import { logger } from '@/lib/logger';

const MAILS_DIR = process.env.MAIL_STORAGE_PATH ?? './data/mails';

export interface AnalysisFileEntry {
  fileName: string;
  filePath: string;
}

/**
 * 메일 텍스트를 파일로 저장하고 analysis_queue에 pending 상태로 등록합니다.
 */
export function saveAnalysisFile(
  fileName: string,
  textContent: string,
  mailSubject: string | null,
  mailReceivedAt: string | null
): AnalysisFileEntry {
  const filePath = path.join(MAILS_DIR, fileName);

  // 파일 저장
  writeFile(filePath, textContent);

  const now = new Date().toISOString();

  // analysis_queue 등록 (중복 시 무시)
  try {
    db.insert(analysisQueue)
      .values({
        fileName,
        status: 'pending',
        mailSubject,
        mailReceivedAt,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    logger.info('[analysis-file] 분석 큐 등록', { fileName });
  } catch (err) {
    // 이미 존재하는 파일명이면 건너뜀 (unique constraint)
    logger.warn('[analysis-file] 분석 큐 등록 건너뜀 (중복)', { fileName, error: String(err) });
  }

  return { fileName, filePath };
}
