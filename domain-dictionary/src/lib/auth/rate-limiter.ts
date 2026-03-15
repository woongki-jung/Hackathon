// IP 기반 로그인 rate limiter (메모리 기반, 서버 재시작 시 초기화)
// 운영 환경에서는 Redis 등 공유 스토어 사용 권장

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000; // 1분
const MAX_ATTEMPTS = 10;  // 1분에 10회

// global 싱글톤 (Next.js HMR 환경 대응)
declare global {
  // eslint-disable-next-line no-var
  var __loginRateLimit: Map<string, RateLimitEntry> | undefined;
}

function getStore(): Map<string, RateLimitEntry> {
  if (!global.__loginRateLimit) {
    global.__loginRateLimit = new Map();
  }
  return global.__loginRateLimit;
}

/**
 * IP가 rate limit을 초과했는지 확인합니다.
 * @returns true이면 차단, false이면 허용
 */
export function isRateLimited(ip: string): boolean {
  const store = getStore();
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return true;
  }

  entry.count++;
  return false;
}

/**
 * 요청에서 IP 주소를 추출합니다.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}
