export async function register() {
  // Node.js 런타임에서만 실행 (Edge 런타임 제외)
  if (process.env.NEXT_RUNTIME === 'nodejs' && !process.env.VERCEL) {
    // 관리자 계정 시딩
    try {
      const { seedAdmin } = await import('@/lib/auth/seed-admin');
      await seedAdmin();
    } catch (err) {
      console.error('[instrumentation] seedAdmin 실패:', err);
    }

    // 백그라운드 스케줄러 초기화 (SCHED-001)
    try {
      const { initScheduler } = await import('@/lib/scheduler/cron-scheduler');
      await initScheduler();
    } catch (err) {
      console.error('[instrumentation] 스케줄러 초기화 실패:', err);
    }

    // 프로세스 종료 시 정리
    process.once('SIGTERM', async () => {
      const { stopScheduler } = await import('@/lib/scheduler/cron-scheduler');
      stopScheduler();
    });
  }
}
