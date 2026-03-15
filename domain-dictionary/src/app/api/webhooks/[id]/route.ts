import { NextResponse } from 'next/server';
import { requireAdmin, isNextResponse } from '@/lib/auth/require-admin';
import { db } from '@/db';
import { webhooks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

// WEBHOOK-API-004: 웹훅 삭제 (admin)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (isNextResponse(authResult)) return authResult;

  const { id } = await params;

  const existing = db.select().from(webhooks).where(eq(webhooks.id, id)).get();
  if (!existing) {
    return NextResponse.json({ success: false, message: '웹훅을 찾을 수 없습니다.' }, { status: 404 });
  }

  db.delete(webhooks).where(eq(webhooks.id, id)).run();

  logger.info('[api/webhooks] 웹훅 삭제', { id, code: existing.code, userId: authResult.userId });

  return NextResponse.json({ success: true, message: '웹훅이 삭제되었습니다.' });
}
