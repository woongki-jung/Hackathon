import { eq, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/db';
import { users } from '@/db/schema';
import { requireAdmin, isNextResponse } from '@/lib/auth/require-admin';
import { validateUsername, validatePassword } from '@/lib/validators/auth';
import { validateRole } from '@/lib/validators/user';

export const runtime = 'nodejs';

// USER-001: 사용자 목록 조회
export async function GET() {
  const authResult = await requireAdmin();
  if (isNextResponse(authResult)) return authResult;

  const items = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(isNull(users.deletedAt));

  return NextResponse.json({ success: true, data: { items } });
}

// USER-002: 사용자 등록
export async function POST(request: Request) {
  const authResult = await requireAdmin();
  if (isNextResponse(authResult)) return authResult;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ success: false, message: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const { username, password, role = 'user' } = body as {
    username?: string;
    password?: string;
    role?: string;
  };

  // 유효성 검사
  const usernameError = validateUsername(username ?? '');
  if (usernameError) return NextResponse.json({ success: false, message: usernameError }, { status: 400 });

  const passwordError = validatePassword(password ?? '');
  if (passwordError) return NextResponse.json({ success: false, message: passwordError }, { status: 400 });

  const roleError = validateRole(role);
  if (roleError) return NextResponse.json({ success: false, message: roleError }, { status: 400 });

  // 중복 확인 (소프트 삭제 포함)
  const [existing] = await db.select().from(users).where(eq(users.username, username!));
  if (existing) {
    return NextResponse.json(
      { success: false, message: '이미 사용 중인 아이디입니다.' },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password!, 10);
  const now = new Date().toISOString();

  const [newUser] = await db
    .insert(users)
    .values({
      username: username!,
      passwordHash,
      role: role as 'admin' | 'user',
      isActive: 1,
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: users.id,
      username: users.username,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    });

  return NextResponse.json({ success: true, data: newUser }, { status: 201 });
}
