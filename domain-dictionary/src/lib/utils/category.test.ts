import { describe, it, expect } from 'vitest';
import { getCategoryLabel, getCategoryColor, CATEGORY_LABELS, CATEGORY_COLORS } from './category';

describe('getCategoryLabel', () => {
  it('"emr" → "EMR"', () => {
    expect(getCategoryLabel('emr')).toBe('EMR');
  });

  it('"business" → "비즈니스"', () => {
    expect(getCategoryLabel('business')).toBe('비즈니스');
  });

  it('"abbreviation" → "약어"', () => {
    expect(getCategoryLabel('abbreviation')).toBe('약어');
  });

  it('"general" → "일반"', () => {
    expect(getCategoryLabel('general')).toBe('일반');
  });

  it('null이면 기본값 "일반" 반환', () => {
    expect(getCategoryLabel(null)).toBe('일반');
  });

  it('미정의 카테고리이면 기본값 "일반" 반환', () => {
    expect(getCategoryLabel('unknown')).toBe('일반');
  });
});

describe('getCategoryColor', () => {
  it('"emr" → blue 클래스', () => {
    expect(getCategoryColor('emr')).toBe(CATEGORY_COLORS.emr);
    expect(getCategoryColor('emr')).toContain('blue');
  });

  it('"business" → green 클래스', () => {
    expect(getCategoryColor('business')).toBe(CATEGORY_COLORS.business);
    expect(getCategoryColor('business')).toContain('green');
  });

  it('"abbreviation" → orange 클래스', () => {
    expect(getCategoryColor('abbreviation')).toBe(CATEGORY_COLORS.abbreviation);
    expect(getCategoryColor('abbreviation')).toContain('orange');
  });

  it('"general" → gray 클래스', () => {
    expect(getCategoryColor('general')).toBe(CATEGORY_COLORS.general);
    expect(getCategoryColor('general')).toContain('gray');
  });

  it('null이면 general 색상 반환', () => {
    expect(getCategoryColor(null)).toBe(CATEGORY_COLORS.general);
  });

  it('미정의 카테고리이면 general 색상 반환', () => {
    expect(getCategoryColor('unknown')).toBe(CATEGORY_COLORS.general);
  });
});
