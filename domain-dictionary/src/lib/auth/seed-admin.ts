import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { validateUsername, validatePassword } from '@/lib/validators/auth';

const BCRYPT_SALT_ROUNDS = 10;

/**
 * 서버 시작 시 초기 관리자 계정을 자동 생성합니다. (AUTH-R-001, AUTH-R-007)
 * ADMIN_USERNAME, ADMIN_PASSWORD 환경변수가 없으면 건너뜁니다.
 */
export async function seedAdmin(): Promise<void> {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.log('[seed-admin] ADMIN_USERNAME 또는 ADMIN_PASSWORD가 설정되지 않아 건너뜁니다.');
    return;
  }

  // 유효성 검사
  const usernameError = validateUsername(username);
  if (usernameError) {
    console.error(`[seed-admin] ADMIN_USERNAME 오류: ${usernameError}`);
    return;
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    console.error(`[seed-admin] ADMIN_PASSWORD 오류: ${passwordError}`);
    return;
  }

  // 이미 존재하는 경우 건너뜀
  const [existing] = await db.select().from(users).where(eq(users.username, username));
  if (existing) {
    console.log(`[seed-admin] 관리자 계정이 이미 존재합니다.`);
    return;
  }

  // bcrypt 해싱 후 삽입
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  await db.insert(users)
    .values({
      username,
      passwordHash,
      role: 'admin',
      isActive: 1,
    });

  console.log(`[seed-admin] 관리자 계정 '${username}'이 생성되었습니다.`);
}
