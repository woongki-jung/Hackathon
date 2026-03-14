// CMN-HTTP-001: 지수 백오프 재시도
import { logger } from '@/lib/logger';

interface RetryOptions {
  maxAttempts?: number;   // 최대 시도 횟수 (기본 3)
  baseDelayMs?: number;   // 첫 번째 대기 시간(ms) (기본 1000)
}

/**
 * 비동기 함수를 최대 maxAttempts번 재시도합니다.
 * 실패 시 1s, 2s, 4s... 지수 백오프 대기
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 1000 } = options;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        logger.warn('[retry] 재시도 대기', { attempt, maxAttempts, delayMs: delay, error: String(err) });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}
