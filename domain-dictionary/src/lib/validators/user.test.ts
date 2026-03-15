import { describe, it, expect } from 'vitest';
import { validateRole } from './user';

describe('validateRole', () => {
  it('"admin"은 허용', () => {
    expect(validateRole('admin')).toBeNull();
  });

  it('"user"는 허용', () => {
    expect(validateRole('user')).toBeNull();
  });

  it('undefined이면 null 반환 (기본값 처리)', () => {
    expect(validateRole(undefined)).toBeNull();
  });

  it('null이면 null 반환', () => {
    expect(validateRole(null)).toBeNull();
  });

  it('빈 문자열이면 null 반환', () => {
    expect(validateRole('')).toBeNull();
  });

  it('"superadmin"이면 오류 반환', () => {
    expect(validateRole('superadmin')).not.toBeNull();
  });

  it('"guest"이면 오류 반환', () => {
    expect(validateRole('guest')).not.toBeNull();
  });

  it('숫자 값이면 오류 반환', () => {
    expect(validateRole(1)).not.toBeNull();
  });
});
