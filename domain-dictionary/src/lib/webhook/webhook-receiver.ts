// WEBHOOK-001: 웹훅 수신 처리 — 페이로드를 파일로 저장하고 분석 큐에 등록
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { webhooks, analysisQueue } from '@/db/schema';
import { writeFile } from '@/lib/fs/file-manager';
import { logger } from '@/lib/logger';
import path from 'path';

const STORAGE_DIR = process.env.MAIL_STORAGE_PATH ?? './data/mails';

export interface WebhookPayload {
  /** 메시지 제목 또는 요약 (선택) */
  subject?: string;
  /** 분석할 본문 내용 */
  body: string;
  /** 수신 시각 (ISO 8601, 선택) */
  receivedAt?: string;
}

/**
 * 웹훅 코드를 DB에서 확인하고 페이로드를 파일로 저장하여 분석 큐에 등록합니다.
 * @returns 등록된 fileName 또는 null (코드 미존재 시)
 */
export async function processWebhookPayload(
  code: string,
  payload: WebhookPayload
): Promise<{ fileName: string } | null> {
  // 웹훅 코드 유효성 확인
  const webhook = db.select().from(webhooks).where(eq(webhooks.code, code)).get();
  if (!webhook) {
    logger.warn('[webhook-receiver] 미등록 웹훅 코드', { code });
    return null;
  }

  const now = new Date().toISOString();
  const receivedAt = payload.receivedAt ?? now;

  // 파일명: webhook_{code}_{timestamp}.txt
  const safeCode = code.replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = Date.now();
  const fileName = `webhook_${safeCode}_${timestamp}.txt`;
  const filePath = path.join(STORAGE_DIR, fileName);

  // 텍스트 콘텐츠 구성
  const textContent = [
    payload.subject ? `제목: ${payload.subject}` : '',
    `웹훅: ${webhook.description}`,
    `수신: ${receivedAt}`,
    '',
    payload.body,
  ]
    .filter((line) => line !== '' || line === '')
    .join('\n')
    .trim();

  // 파일 저장
  writeFile(filePath, textContent);

  // analysis_queue 등록 (중복 시 무시)
  try {
    db.insert(analysisQueue)
      .values({
        fileName,
        webhookCode: code,
        status: 'pending',
        sourceDescription: payload.subject ?? webhook.description,
        receivedAt,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    logger.info('[webhook-receiver] 분석 큐 등록', { fileName, code });
  } catch (err) {
    logger.warn('[webhook-receiver] 분석 큐 등록 건너뜀 (중복)', { fileName, error: String(err) });
  }

  return { fileName };
}
