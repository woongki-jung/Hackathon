import { NextResponse } from 'next/server';
import { processWebhookPayload } from '@/lib/webhook/webhook-receiver';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
// Vercel 함수 최대 실행 시간 60초 (Gemini 분석 시간 확보)
export const maxDuration = 60;

// WEBHOOK-API-001: 웹훅 수신 (공개 엔드포인트 — 인증 불필요)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ success: false, message: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const { subject, body: textBody, receivedAt } = body as {
    subject?: string;
    body?: string;
    receivedAt?: string;
  };

  if (!textBody || typeof textBody !== 'string' || textBody.trim() === '') {
    return NextResponse.json({ success: false, message: 'body 필드는 필수입니다.' }, { status: 400 });
  }

  logger.info('[api/webhook] 웹훅 수신', { code });

  const result = await processWebhookPayload(code, {
    subject,
    body: textBody,
    receivedAt,
  });

  if (!result) {
    return NextResponse.json(
      { success: false, message: '등록되지 않은 웹훅 코드입니다.' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    message: result.status === 'completed' ? '분석이 완료되었습니다.' : '분석 큐에 등록되었습니다.',
    data: {
      queueId: result.queueId,
      fileName: result.fileName,
      status: result.status,
    },
  });
}
