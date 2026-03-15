export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') return;

  // DB 초기화 (테이블 생성 + 마이그레이션)
  try {
    const { initDb } = await import('@/db');
    await initDb();
  } catch (err) {
    console.error('[instrumentation] DB 초기화 실패:', err);
  }

  // 관리자 계정 시딩 (Vercel 포함 모든 환경에서 실행)
  try {
    const { seedAdmin } = await import('@/lib/auth/seed-admin');
    await seedAdmin();
  } catch (err) {
    console.error('[instrumentation] seedAdmin 실패:', err);
  }
}
