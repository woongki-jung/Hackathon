import { describe, it, expect, vi, beforeEach } from 'vitest';
import { filterStopWords, getStopWords } from './stopword-filter';

// DB 의존성 모킹
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}));
vi.mock('@/db/schema', () => ({
  stopWords: { word: 'word' },
}));

// --- filterStopWords 순수 함수 테스트 (모킹 불필요) ---
describe('filterStopWords', () => {
  it('불용어 Set에 있는 단어 제거', () => {
    const stopWordSet = new Set(['the', 'and', 'or']);
    const result = filterStopWords(['the', 'EMR', 'and', 'system'], stopWordSet);
    expect(result).toEqual(['EMR', 'system']);
  });

  it('대소문자 무시하여 필터링', () => {
    const stopWordSet = new Set(['emr']);
    const result = filterStopWords(['EMR', 'system'], stopWordSet);
    expect(result).toEqual(['system']); // 'EMR'.toLowerCase() === 'emr' → 제거
  });

  it('빈 배열 입력 시 빈 배열 반환', () => {
    const stopWordSet = new Set(['test']);
    expect(filterStopWords([], stopWordSet)).toEqual([]);
  });

  it('빈 Set이면 아무것도 제거하지 않음', () => {
    const terms = ['EMR', '시스템', '업무'];
    expect(filterStopWords(terms, new Set())).toEqual(terms);
  });

  it('앞뒤 공백 포함 단어도 trim 후 비교', () => {
    const stopWordSet = new Set(['emr']);
    const result = filterStopWords(['  EMR  ', 'system'], stopWordSet);
    expect(result).toEqual(['system']); // '  EMR  '.toLowerCase().trim() === 'emr'
  });

  it('불용어가 없으면 모든 단어 유지', () => {
    const stopWordSet = new Set(['other']);
    const terms = ['EMR', 'HIS', 'OCS'];
    expect(filterStopWords(terms, stopWordSet)).toEqual(terms);
  });
});

// --- getStopWords DB 의존 테스트 ---
describe('getStopWords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('DB 반환값으로 소문자 Set 생성', async () => {
    const { db } = await import('@/db');
    const mockChain = {
      from: vi.fn().mockResolvedValue([{ word: 'EMR' }, { word: 'HIS' }]),
    };
    vi.mocked(db.select).mockReturnValue(mockChain as unknown as ReturnType<typeof db.select>);

    const result = await getStopWords();
    expect(result).toBeInstanceOf(Set);
    expect(result.has('emr')).toBe(true);
    expect(result.has('his')).toBe(true);
  });

  it('DB 빈 결과이면 빈 Set 반환', async () => {
    const { db } = await import('@/db');
    const mockChain = {
      from: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(db.select).mockReturnValue(mockChain as unknown as ReturnType<typeof db.select>);

    const result = await getStopWords();
    expect(result.size).toBe(0);
  });
});
