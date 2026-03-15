import { NextResponse } from 'next/server';
import { requireAdmin, isNextResponse } from '@/lib/auth/require-admin';
import { db } from '@/db';
import { webhooks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

// WEBHOOK-API-002: 웹훅 목록 조회 (admin)
export async function GET() {
  const authResult = await requireAdmin();
  if (isNextResponse(authResult)) return authResult;

  const list = await db.select().from(webhooks);
  logger.info('[api/webhooks] 목록 조회');

  return NextResponse.json({ success: true, data: list });
}

// WEBHOOK-API-003: 웹훅 생성 (admin)
export async function POST(request: Request) {
  const authResult = await requireAdmin();
  if (isNextResponse(authResult)) return authResult;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ success: false, message: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const { code, description } = body as { code?: string; description?: string };

  if (!code || typeof code !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(code)) {
    return NextResponse.json(
      { success: false, message: 'code는 영문/숫자/하이픈/언더스코어 1~100자여야 합니다.' },
      { status: 400 }
    );
  }
  if (!description || typeof description !== 'string' || description.trim() === '') {
    return NextResponse.json({ success: false, message: 'description은 필수입니다.' }, { status: 400 });
  }

  // 중복 코드 확인
  const [existing] = await db.select().from(webhooks).where(eq(webhooks.code, code));
  if (existing) {
    return NextResponse.json({ success: false, message: '이미 사용 중인 코드입니다.' }, { status: 409 });
  }

  const now = new Date().toISOString();
  const [inserted] = await db
    .insert(webhooks)
    .values({ code, description: description.trim(), createdAt: now })
    .returning();

  logger.info('[api/webhooks] 웹훅 생성', { code, userId: authResult.userId });

  return NextResponse.json({ success: true, data: inserted }, { status: 201 });
}
