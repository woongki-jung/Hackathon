// TERM-BATCH-001: 배치 분석 오케스트레이션 (용어 추출 + 해설 생성 + 사전 저장)
import { eq, and, lt, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { analysisQueue } from '@/db/schema';
import { readFile } from '@/lib/fs/file-manager';
import { filterPII } from './pii-filter';
import { extractTerms } from './term-extractor';
import { generateMailAnalysis } from './description-generator';
import { saveTerm } from '@/lib/dictionary/dictionary-store';
import { GeminiError } from './gemini-client';
import { logger } from '@/lib/logger';

const MAILS_DIR = process.env.MAIL_STORAGE_PATH ?? './data/mails';
const MAX_RETRY = 3;

/**
 * analysis_queue의 pending 항목을 순차 처리합니다.
 * - retry_count < 3인 failed 항목도 재시도
 * - API 키 미설정 시 전체 건너뜀
 */
export async function runBatchAnalysis(): Promise<{ analyzed: number; failed: number }> {
  // 처리 대상: pending 또는 재시도 가능한 failed
  const queue = db
    .select()
    .from(analysisQueue)
    .where(
      and(
        lt(analysisQueue.retryCount, MAX_RETRY),
        isNull(analysisQueue.analyzedAt)
      )
    )
    .all()
    .filter((item) => item.status === 'pending' || item.status === 'failed');

  logger.info('[batch-analyzer] 분석 대상', { count: queue.length });

  let analyzed = 0;
  let failed = 0;

  for (const item of queue) {
    const now = new Date().toISOString();

    // processing 상태로 전환
    db.update(analysisQueue)
      .set({ status: 'processing', updatedAt: now })
      .where(eq(analysisQueue.id, item.id))
      .run();

    try {
      // 파일 읽기
      const filePath = `${MAILS_DIR}/${item.fileName}`;
      const rawText = readFile(filePath);
      if (!rawText) {
        throw new Error(`파일을 찾을 수 없음: ${filePath}`);
      }

      // PII 필터링
      const cleanText = filterPII(rawText);

      // 병렬 분석 (용어 추출 + 메일 요약)
      const [terms, mailAnalysis] = await Promise.all([
        extractTerms(cleanText),
        generateMailAnalysis(cleanText),
      ]);

      // 용어 저장
      for (const term of terms) {
        try {
          saveTerm(term, {
            fileName: item.fileName,
            sourceDescription: item.sourceDescription,
            receivedAt: item.receivedAt,
          });
        } catch (err) {
          logger.warn('[batch-analyzer] 용어 저장 실패', { term: term.name, error: String(err) });
        }
      }

      // completed 상태로 전환
      db.update(analysisQueue)
        .set({
          status: 'completed',
          summary: mailAnalysis.summary,
          actionItems: JSON.stringify(mailAnalysis.actionItems),
          extractedTermCount: terms.length,
          analyzedAt: now,
          errorMessage: null,
          updatedAt: now,
        })
        .where(eq(analysisQueue.id, item.id))
        .run();

      analyzed++;
      logger.info('[batch-analyzer] 분석 완료', { fileName: item.fileName, termCount: terms.length });
    } catch (err) {
      failed++;
      const errorMsg = err instanceof Error ? err.message : String(err);

      // API 키 미설정 시 pending 유지 (재시도 카운트 증가 안 함)
      if (err instanceof GeminiError && err.code === 'NO_API_KEY') {
        db.update(analysisQueue)
          .set({ status: 'pending', errorMessage: errorMsg, updatedAt: now })
          .where(eq(analysisQueue.id, item.id))
          .run();
        logger.warn('[batch-analyzer] API 키 미설정 — 전체 중단');
        break; // 나머지도 모두 건너뜀
      }

      // 일반 오류: failed + retryCount 증가
      db.update(analysisQueue)
        .set({
          status: 'failed',
          retryCount: item.retryCount + 1,
          errorMessage: errorMsg,
          updatedAt: now,
        })
        .where(eq(analysisQueue.id, item.id))
        .run();

      logger.error('[batch-analyzer] 분석 실패', { fileName: item.fileName, error: errorMsg });
    }
  }

  logger.info('[batch-analyzer] 배치 완료', { analyzed, failed });
  return { analyzed, failed };
}
