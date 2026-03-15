import { describe, it, expect } from 'vitest';
import { validateUsername, validatePassword } from './auth';

describe('validateUsername', () => {
  it('빈 문자열이면 오류 반환', () => {
    expect(validateUsername('')).not.toBeNull();
  });

  it('공백만 있으면 오류 반환', () => {
    expect(validateUsername('   ')).not.toBeNull();
  });

  it('3자(최소 미만)이면 오류 반환', () => {
    expect(validateUsername('abc')).not.toBeNull();
  });

  it('4자(경계값 최소)는 허용', () => {
    expect(validateUsername('abcd')).toBeNull();
  });

  it('20자(경계값 최대)는 허용', () => {
    expect(validateUsername('a'.repeat(20))).toBeNull();
  });

  it('21자(최대 초과)이면 오류 반환', () => {
    expect(validateUsername('a'.repeat(21))).not.toBeNull();
  });

  it('영소문자, 숫자, 밑줄 조합 허용', () => {
    expect(validateUsername('abc_123')).toBeNull();
  });

  it('대문자 포함 시 오류 반환', () => {
    expect(validateUsername('Abcdef')).not.toBeNull();
  });

  it('특수문자(밑줄 제외) 포함 시 오류 반환', () => {
    expect(validateUsername('abc-def')).not.toBeNull();
  });

  it('공백 포함 시 오류 반환', () => {
    expect(validateUsername('abc def')).not.toBeNull();
  });
});

describe('validatePassword', () => {
  it('빈 문자열이면 오류 반환', () => {
    expect(validatePassword('')).not.toBeNull();
  });

  it('공백만 있으면 오류 반환', () => {
    expect(validatePassword('   ')).not.toBeNull();
  });

  it('7자(8자 미만)이면 오류 반환', () => {
    expect(validatePassword('Ab1!xyz')).not.toBeNull();
  });

  it('8자 이상 + 영문+숫자+특수문자 조합이면 통과', () => {
    expect(validatePassword('Ab1!abcd')).toBeNull();
  });

  it('영문자 없으면 오류 반환', () => {
    expect(validatePassword('12345!@#')).not.toBeNull();
  });

  it('숫자 없으면 오류 반환', () => {
    expect(validatePassword('abcd!@#$')).not.toBeNull();
  });

  it('특수문자 없으면 오류 반환', () => {
    expect(validatePassword('abcd1234')).not.toBeNull();
  });

  it('다양한 특수문자 허용', () => {
    expect(validatePassword('Passw0rd!')).toBeNull();
    expect(validatePassword('Test@1234')).toBeNull();
    expect(validatePassword('Hello#1World')).toBeNull();
  });
});
