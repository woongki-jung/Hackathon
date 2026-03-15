// WEBHOOK-001: 웹훅 수신 처리 — 페이로드를 DB에 저장하고 즉시 분석 실행
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { webhooks, analysisQueue } from '@/db/schema';
import { analyzeSingleItem } from '@/lib/analysis/batch-analyzer';
import { logger } from '@/lib/logger';

export interface WebhookPayload {
  /** 메시지 제목 또는 요약 (선택) */
  subject?: string;
  /** 분석할 본문 내용 */
  body: string;
  /** 수신 시각 (ISO 8601, 선택) */
  receivedAt?: string;
}

export interface WebhookResult {
  fileName: string;
  queueId: string;
  /** 분석 완료 상태 (동기 실행이므로 completed/failed/pending 중 하나) */
  status: string;
}

/**
 * 웹훅 코드를 DB에서 확인하고 페이로드를 DB에 저장한 후 즉시 분석합니다.
 * 분석은 동기적으로 실행되어 완료 후 상태를 반환합니다.
 * @returns WebhookResult 또는 null (코드 미존재 시)
 */
export async function processWebhookPayload(
  code: string,
  payload: WebhookPayload
): Promise<WebhookResult | null> {
  // 웹훅 코드 유효성 확인
  const [webhook] = await db.select().from(webhooks).where(eq(webhooks.code, code));
  if (!webhook) {
    logger.warn('[webhook-receiver] 미등록 웹훅 코드', { code });
    return null;
  }

  const now = new Date().toISOString();
  const receivedAt = payload.receivedAt ?? now;

  // 파일명: webhook_{code}_{timestamp}.txt (식별자로만 사용, 실제 파일 없음)
  const safeCode = code.replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = Date.now();
  const fileName = `webhook_${safeCode}_${timestamp}.txt`;

  // 텍스트 콘텐츠 구성
  const content = [
    payload.subject ? `제목: ${payload.subject}` : null,
    `웹훅: ${webhook.description}`,
    `수신: ${receivedAt}`,
    '',
    payload.body,
  ]
    .filter((line): line is string => line !== null)
    .join('\n')
    .trim();

  // analysis_queue에 content 포함하여 등록
  let queueId: string;
  try {
    const [inserted] = await db.insert(analysisQueue)
      .values({
        fileName,
        webhookCode: code,
        content,
        status: 'pending',
        sourceDescription: payload.subject ?? webhook.description,
        receivedAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: analysisQueue.id });

    queueId = inserted.id;
    logger.info('[webhook-receiver] 분석 큐 등록', { fileName, code, queueId });
  } catch (err) {
    logger.warn('[webhook-receiver] 분석 큐 등록 실패', { fileName, error: String(err) });
    return { fileName, queueId: '', status: 'failed' };
  }

  // 즉시 분석 실행 (동기) — 응답 전 완료하여 Vercel 함수 종료 전 상태 확정
  const [item] = await db.select().from(analysisQueue).where(eq(analysisQueue.id, queueId));
  if (item) {
    try {
      await analyzeSingleItem(item);
      logger.info('[webhook-receiver] 즉시 분석 완료', { fileName, queueId });
    } catch (err) {
      logger.error('[webhook-receiver] 즉시 분석 실패', { fileName, queueId, error: String(err) });
    }
  }

  // 최종 상태 조회
  const [final] = await db.select({ status: analysisQueue.status })
    .from(analysisQueue)
    .where(eq(analysisQueue.id, queueId));

  return { fileName, queueId, status: final?.status ?? 'pending' };
}
