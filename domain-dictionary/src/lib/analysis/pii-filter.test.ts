import { describe, it, expect } from 'vitest';
import { filterPII } from './pii-filter';

describe('filterPII', () => {
  it('이메일 주소를 [EMAIL]로 마스킹', () => {
    expect(filterPII('문의: test@example.com 로 보내주세요')).toBe('문의: [EMAIL] 로 보내주세요');
  });

  it('여러 이메일 동시 마스킹', () => {
    const result = filterPII('a@b.com 과 c@d.org');
    expect(result).toBe('[EMAIL] 과 [EMAIL]');
  });

  it('휴대폰(010-XXXX-XXXX)을 [PHONE]으로 마스킹', () => {
    expect(filterPII('전화: 010-1234-5678')).toContain('[PHONE]');
    expect(filterPII('전화: 010-1234-5678')).not.toContain('010-1234-5678');
  });

  it('휴대폰(구분자 없음 01012345678) 마스킹', () => {
    expect(filterPII('01012345678')).toContain('[PHONE]');
  });

  it('다른 통신사 휴대폰(011, 016, 017, 018, 019) 마스킹', () => {
    expect(filterPII('011-123-4567')).toContain('[PHONE]');
    expect(filterPII('019-987-6543')).toContain('[PHONE]');
  });

  it('일반 전화번호(02-XXXX-XXXX) 마스킹', () => {
    expect(filterPII('02-1234-5678')).toContain('[PHONE]');
  });

  it('지역 전화번호(031-XXX-XXXX) 마스킹', () => {
    expect(filterPII('031-123-4567')).toContain('[PHONE]');
  });

  it('주민등록번호(XXXXXX-XXXXXXX)를 [ID_NUM]으로 마스킹', () => {
    expect(filterPII('주민번호: 900101-1234567')).toContain('[ID_NUM]');
    expect(filterPII('900101-1234567')).not.toContain('900101-1234567');
  });

  it('복합 PII (이메일 + 전화번호) 동시 마스킹', () => {
    const result = filterPII('이메일: user@test.com, 전화: 010-9999-8888');
    expect(result).toContain('[EMAIL]');
    expect(result).toContain('[PHONE]');
  });

  it('PII 없는 텍스트는 그대로 반환', () => {
    const text = 'EMR 시스템 업데이트 안내 메일입니다.';
    expect(filterPII(text)).toBe(text);
  });

  it('빈 문자열이면 빈 문자열 반환', () => {
    expect(filterPII('')).toBe('');
  });
});
