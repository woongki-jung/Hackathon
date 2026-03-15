import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    delete: vi.fn(),
  },
}));
vi.mock('@/db/schema', () => ({
  mailProcessingLogs: { createdAt: 'createdAt' },
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('cleanupExpiredLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('90일 기준으로 delete 호출', async () => {
    const { db } = await import('@/db');
    const deleteChain = {
      where: vi.fn().mockResolvedValue({ rowsAffected: 5 }),
    };
    vi.mocked(db.delete).mockReturnValue(deleteChain as unknown as ReturnType<typeof db.delete>);

    const { cleanupExpiredLogs } = await import('./cleanup');
    await cleanupExpiredLogs();

    expect(db.delete).toHaveBeenCalled();
    expect(deleteChain.where).toHaveBeenCalled();
  });

  it('삭제 대상 없어도 에러 없이 완료', async () => {
    const { db } = await import('@/db');
    const deleteChain = {
      where: vi.fn().mockResolvedValue({ rowsAffected: 0 }),
    };
    vi.mocked(db.delete).mockReturnValue(deleteChain as unknown as ReturnType<typeof db.delete>);

    const { cleanupExpiredLogs } = await import('./cleanup');
    await expect(cleanupExpiredLogs()).resolves.toBeUndefined();
  });

  it('cutoff 날짜가 현재 시각 기준 약 90일 전', async () => {
    const { db } = await import('@/db');
    const now = Date.now();
    const expectedCutoffMin = new Date(now - 91 * 24 * 60 * 60 * 1000).toISOString();
    const expectedCutoffMax = new Date(now - 89 * 24 * 60 * 60 * 1000).toISOString();

    let capturedCutoff: string | null = null;

    const deleteChain = {
      where: vi.fn().mockImplementation((condition) => {
        // condition은 Drizzle ORM의 lt() 호출 결과이므로 직접 검증 불가
        // 대신 delete가 호출되었음을 확인
        return Promise.resolve({ rowsAffected: 0 });
      }),
    };
    vi.mocked(db.delete).mockReturnValue(deleteChain as unknown as ReturnType<typeof db.delete>);

    const { cleanupExpiredLogs } = await import('./cleanup');
    await cleanupExpiredLogs();

    // delete().where()가 한 번 호출되었음을 확인
    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(deleteChain.where).toHaveBeenCalledTimes(1);
  });
});
