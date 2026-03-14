export async function register() {
  // Node.js 런타임에서만 실행 (Edge 런타임 제외)
  // Vercel 환경에서는 SQLite 파일시스템이 ephemeral하므로 시딩 건너뜀
  if (process.env.NEXT_RUNTIME === 'nodejs' && !process.env.VERCEL) {
    try {
      const { seedAdmin } = await import('@/lib/auth/seed-admin');
      await seedAdmin();
    } catch (err) {
      console.error('[instrumentation] seedAdmin 실패:', err);
    }
  }
}
