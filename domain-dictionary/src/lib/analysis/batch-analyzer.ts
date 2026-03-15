// TERM-BATCH-001: 배치 분석 오케스트레이션 (용어 추출 + 해설 생성 + 사전 저장)
import { eq, and, lt, isNull, lte } from 'drizzle-orm';
import { db } from '@/db';
import { analysisQueue } from '@/db/schema';

// processing 상태로 멈춘 항목을 pending으로 복구하는 기준 시간 (5분)
const STUCK_PROCESSING_THRESHOLD_MS = 5 * 60 * 1000;
import { filterPII } from './pii-filter';
import { extractTerms } from './term-extractor';
import { generateMailAnalysis } from './description-generator';
import { saveTerm } from '@/lib/dictionary/dictionary-store';
import { GeminiError } from './gemini-client';
import { logger } from '@/lib/logger';

const MAX_RETRY = 3;

type QueueItem = typeof analysisQueue.$inferSelect;

/**
 * 단일 분석 큐 항목을 처리합니다.
 * content 컬럼의 텍스트를 직접 분석합니다 (파일 시스템 불필요).
 */
export async function analyzeSingleItem(item: QueueItem): Promise<void> {
  const now = new Date().toISOString();

  // processing 상태로 전환
  await db.update(analysisQueue)
    .set({ status: 'processing', updatedAt: now })
    .where(eq(analysisQueue.id, item.id));

  try {
    const rawText = item.content;
    if (!rawText) {
      throw new Error(`분석 콘텐츠가 없습니다: ${item.fileName}`);
    }

    // PII 필터링
    const cleanText = filterPII(rawText);

    // 병렬 분석 (용어 추출 + 요약)
    const [terms, mailAnalysis] = await Promise.all([
      extractTerms(cleanText),
      generateMailAnalysis(cleanText),
    ]);

    // 용어 저장
    for (const term of terms) {
      try {
        await saveTerm(term, {
          fileName: item.fileName,
          sourceDescription: item.sourceDescription,
          receivedAt: item.receivedAt,
        });
      } catch (err) {
        logger.warn('[batch-analyzer] 용어 저장 실패', { term: term.name, error: String(err) });
      }
    }

    // completed 상태로 전환
    await db.update(analysisQueue)
      .set({
        status: 'completed',
        summary: mailAnalysis.summary,
        actionItems: JSON.stringify(mailAnalysis.actionItems),
        extractedTermCount: terms.length,
        analyzedAt: now,
        errorMessage: null,
        updatedAt: now,
      })
      .where(eq(analysisQueue.id, item.id));

    logger.info('[batch-analyzer] 분석 완료', { fileName: item.fileName, termCount: terms.length });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    // API 키 미설정 시 pending 유지 (재시도 카운트 증가 안 함)
    if (err instanceof GeminiError && err.code === 'NO_API_KEY') {
      await db.update(analysisQueue)
        .set({ status: 'pending', errorMessage: errorMsg, updatedAt: now })
        .where(eq(analysisQueue.id, item.id));
      logger.warn('[batch-analyzer] API 키 미설정');
      throw err; // 호출자에게 전파
    }

    // 일반 오류: failed + retryCount 증가
    await db.update(analysisQueue)
      .set({
        status: 'failed',
        retryCount: item.retryCount + 1,
        errorMessage: errorMsg,
        updatedAt: now,
      })
      .where(eq(analysisQueue.id, item.id));

    logger.error('[batch-analyzer] 분석 실패', { fileName: item.fileName, error: errorMsg });
    throw err;
  }
}

/**
 * analysis_queue의 pending/failed 항목을 순차 처리합니다. (수동 재처리용)
 * 시작 시 5분 이상 processing 상태인 stuck 항목을 pending으로 복구합니다.
 */
export async function runBatchAnalysis(): Promise<{ analyzed: number; failed: number }> {
  // stuck processing 항목 복구 (Vercel 함수 종료로 인해 완료되지 않은 항목)
  const stuckCutoff = new Date(Date.now() - STUCK_PROCESSING_THRESHOLD_MS).toISOString();
  await db.update(analysisQueue)
    .set({ status: 'pending', updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(analysisQueue.status, 'processing'),
        lte(analysisQueue.updatedAt, stuckCutoff)
      )
    );

  const allItems = await db
    .select()
    .from(analysisQueue)
    .where(
      and(
        lt(analysisQueue.retryCount, MAX_RETRY),
        isNull(analysisQueue.analyzedAt)
      )
    );

  const queue = allItems.filter((item) => item.status === 'pending' || item.status === 'failed');

  logger.info('[batch-analyzer] 분석 대상', { count: queue.length });

  let analyzed = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      await analyzeSingleItem(item);
      analyzed++;
    } catch (err) {
      failed++;
      if (err instanceof GeminiError && err.code === 'NO_API_KEY') {
        break; // API 키 없으면 나머지 모두 건너뜀
      }
    }
  }

  logger.info('[batch-analyzer] 배치 완료', { analyzed, failed });
  return { analyzed, failed };
}
