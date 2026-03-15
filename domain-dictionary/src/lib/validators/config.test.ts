import { describe, it, expect } from 'vitest';
import { validateCheckInterval } from './config';

describe('validateCheckInterval', () => {
  it('null이면 null 반환 (선택 필드)', () => {
    expect(validateCheckInterval(null)).toBeNull();
  });

  it('undefined이면 null 반환', () => {
    expect(validateCheckInterval(undefined)).toBeNull();
  });

  it('빈 문자열이면 null 반환', () => {
    expect(validateCheckInterval('')).toBeNull();
  });

  it('60000ms(1분)은 허용', () => {
    expect(validateCheckInterval(60000)).toBeNull();
  });

  it('60001ms 이상도 허용', () => {
    expect(validateCheckInterval(3600000)).toBeNull();
  });

  it('59999ms(1분 미만)이면 오류 반환', () => {
    expect(validateCheckInterval(59999)).not.toBeNull();
  });

  it('0이면 오류 반환', () => {
    expect(validateCheckInterval(0)).not.toBeNull();
  });

  it('음수이면 오류 반환', () => {
    expect(validateCheckInterval(-1)).not.toBeNull();
  });

  it('숫자 문자열은 숫자로 변환하여 검증', () => {
    expect(validateCheckInterval('60000')).toBeNull();
    expect(validateCheckInterval('59999')).not.toBeNull();
  });

  it('비숫자 문자열이면 오류 반환', () => {
    expect(validateCheckInterval('abc')).not.toBeNull();
  });

  it('Infinity이면 오류 반환', () => {
    expect(validateCheckInterval(Infinity)).not.toBeNull();
  });

  it('NaN이면 오류 반환', () => {
    expect(validateCheckInterval(NaN)).not.toBeNull();
  });
});
