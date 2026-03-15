import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { isRateLimited, getClientIp } from './rate-limiter';

describe('isRateLimited', () => {
  beforeEach(() => {
    // 전역 상태 초기화 (테스트 간 격리)
    global.__loginRateLimit = undefined;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.__loginRateLimit = undefined;
  });

  it('처음 요청은 차단되지 않음', () => {
    expect(isRateLimited('1.2.3.4')).toBe(false);
  });

  it('10번째 요청까지는 차단되지 않음', () => {
    const ip = '1.2.3.4';
    // 첫 번째 호출: count=1 생성, 이후 count++ → 10번째 호출 후 count=10
    for (let i = 0; i < 10; i++) {
      expect(isRateLimited(ip)).toBe(false);
    }
  });

  it('11번째 요청은 차단됨 (MAX_ATTEMPTS = 10)', () => {
    const ip = '1.2.3.4';
    // 첫 번째 호출: count=1 생성
    // 2~10번째: count++ → count=10
    // 11번째: count(10) >= MAX_ATTEMPTS(10) → 차단
    for (let i = 0; i < 10; i++) {
      isRateLimited(ip);
    }
    expect(isRateLimited(ip)).toBe(true);
  });

  it('윈도우(1분) 만료 후 카운트 리셋', () => {
    const ip = '1.2.3.4';
    // 11번 시도하여 차단 상태 만들기
    for (let i = 0; i < 11; i++) {
      isRateLimited(ip);
    }
    expect(isRateLimited(ip)).toBe(true);

    // 60초 이상 경과
    vi.advanceTimersByTime(61_000);

    // 리셋 후 허용
    expect(isRateLimited(ip)).toBe(false);
  });

  it('서로 다른 IP는 독립적으로 카운트', () => {
    const ip1 = '1.1.1.1';
    const ip2 = '2.2.2.2';

    // ip1을 11번 시도하여 차단 상태로
    for (let i = 0; i < 11; i++) {
      isRateLimited(ip1);
    }
    expect(isRateLimited(ip1)).toBe(true);
    // ip2는 영향 없음
    expect(isRateLimited(ip2)).toBe(false);
  });
});

describe('getClientIp', () => {
  it('x-forwarded-for 헤더에서 첫 번째 IP 추출', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('x-forwarded-for 단일 IP', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '9.9.9.9' },
    });
    expect(getClientIp(req)).toBe('9.9.9.9');
  });

  it('x-real-ip 헤더에서 IP 추출', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '3.3.3.3' },
    });
    expect(getClientIp(req)).toBe('3.3.3.3');
  });

  it('헤더 없으면 "unknown" 반환', () => {
    const req = new Request('http://localhost');
    expect(getClientIp(req)).toBe('unknown');
  });
});
