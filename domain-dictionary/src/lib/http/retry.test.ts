import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry } from './retry';

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('첫 시도에 성공하면 결과 반환', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 100 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('첫 시도 실패 후 재시도하여 성공', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockResolvedValueOnce('retry success');

    // rejects 기대값과 타이머 진행을 동시에 수행 (unhandled rejection 방지)
    const [result] = await Promise.all([
      withRetry(fn, { maxAttempts: 3, baseDelayMs: 100 }),
      vi.runAllTimersAsync(),
    ]);

    expect(result).toBe('retry success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('모든 시도 실패 시 마지막 에러 throw', async () => {
    const error = new Error('persistent error');
    const fn = vi.fn().mockRejectedValue(error);

    await Promise.all([
      expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 100 })).rejects.toThrow('persistent error'),
      vi.runAllTimersAsync(),
    ]);

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('기본 maxAttempts=3 적용', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    await Promise.all([
      expect(withRetry(fn)).rejects.toThrow(),
      vi.runAllTimersAsync(),
    ]);

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('지수 백오프: 첫 번째 딜레이는 baseDelayMs', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce('ok');

    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

    await Promise.all([
      withRetry(fn, { maxAttempts: 3, baseDelayMs: 1000 }),
      vi.runAllTimersAsync(),
    ]);

    // setTimeout이 두 번 호출: 1000ms, 2000ms
    const retryDelays = setTimeoutSpy.mock.calls
      .map(call => call[1] as number)
      .filter(delay => typeof delay === 'number' && delay > 0);

    expect(retryDelays[0]).toBe(1000);
    expect(retryDelays[1]).toBe(2000);
  });
});
