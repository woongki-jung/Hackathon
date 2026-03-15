export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') return;

  // 관리자 계정 시딩 (Vercel 포함 모든 환경에서 실행)
  try {
    const { seedAdmin } = await import('@/lib/auth/seed-admin');
    await seedAdmin();
  } catch (err) {
    console.error('[instrumentation] seedAdmin 실패:', err);
  }

  // 백그라운드 스케줄러 초기화 — Vercel Serverless에서는 미실행 (SCHED-001)
  if (!process.env.VERCEL) {
    try {
      const { initScheduler } = await import('@/lib/scheduler/cron-scheduler');
      await initScheduler();
    } catch (err) {
      console.error('[instrumentation] 스케줄러 초기화 실패:', err);
    }

    process.once('SIGTERM', async () => {
      const { stopScheduler } = await import('@/lib/scheduler/cron-scheduler');
      stopScheduler();
    });
  }
}
