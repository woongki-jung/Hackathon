import { describe, it, expect } from 'vitest';
import { formatDate } from './date';

describe('formatDate', () => {
  it('null이면 "-" 반환', () => {
    expect(formatDate(null)).toBe('-');
  });

  it('undefined이면 "-" 반환', () => {
    expect(formatDate(undefined)).toBe('-');
  });

  it('빈 문자열이면 "-" 반환', () => {
    expect(formatDate('')).toBe('-');
  });

  it('정상 ISO 문자열 — 날짜/시간 패턴 출력', () => {
    // toLocaleString('ko-KR') 출력은 환경에 따라 다를 수 있으므로 패턴 검증
    const result = formatDate('2025-01-15T10:30:00.000Z');
    // YYYY-MM-DD HH:mm 또는 유사 형식 포함
    expect(result).toMatch(/\d{4}/);      // 연도 4자리
    expect(result).toMatch(/\d{2}/);      // 최소 2자리 숫자 (월 또는 일)
    expect(result).not.toBe('-');
  });

  it('결과 문자열에 "." 접미사 없음 (replace 처리 확인)', () => {
    const result = formatDate('2025-06-01T00:00:00.000Z');
    // ".으로 끝나지 않아야 함 (replace('.', '') 처리)
    expect(result.endsWith('.')).toBe(false);
  });
});
