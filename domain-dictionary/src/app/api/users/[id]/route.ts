import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { requireAdmin, isNextResponse } from '@/lib/auth/require-admin';

export const runtime = 'nodejs';

// USER-003: 사용자 삭제 (소프트 삭제)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (isNextResponse(authResult)) return authResult;

  const { id } = await params;

  // 자기 삭제 방지
  if (id === authResult.userId) {
    return NextResponse.json(
      { success: false, message: '자기 자신은 삭제할 수 없습니다.' },
      { status: 400 }
    );
  }

  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user || user.deletedAt !== null) {
    return NextResponse.json({ success: false, message: '사용자를 찾을 수 없습니다.' }, { status: 404 });
  }

  await db.update(users)
    .set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(eq(users.id, id));

  return NextResponse.json({ success: true, message: '사용자가 삭제되었습니다.' });
}
