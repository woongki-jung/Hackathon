import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./gemini-client', () => ({
  generateContent: vi.fn(),
  parseJsonResponse: vi.fn(),
  GeminiError: class GeminiError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.name = 'GeminiError';
      this.code = code;
    }
  },
}));
vi.mock('./stopword-filter', () => ({
  getStopWords: vi.fn().mockResolvedValue(new Set<string>()),
  filterStopWords: vi.fn().mockImplementation((terms: string[]) => terms),
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('extractTerms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('정상 응답 — 유효한 용어 배열 반환', async () => {
    const { generateContent, parseJsonResponse } = await import('./gemini-client');
    const { filterStopWords } = await import('./stopword-filter');

    vi.mocked(generateContent).mockResolvedValue('["raw"]');
    vi.mocked(parseJsonResponse).mockReturnValue([
      { name: 'EMR', category: 'emr', description: '전자의무기록' },
      { name: 'HIS', category: 'emr', description: '병원정보시스템' },
    ]);
    vi.mocked(filterStopWords).mockReturnValue(['EMR', 'HIS']);

    const { extractTerms } = await import('./term-extractor');
    const result = await extractTerms('메일 본문 텍스트');

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('EMR');
    expect(result[1].name).toBe('HIS');
  });

  it('잘못된 category 값은 필터링됨', async () => {
    const { generateContent, parseJsonResponse } = await import('./gemini-client');
    const { filterStopWords } = await import('./stopword-filter');

    vi.mocked(generateContent).mockResolvedValue('["raw"]');
    vi.mocked(parseJsonResponse).mockReturnValue([
      { name: 'ValidTerm', category: 'emr', description: '설명' },
      { name: 'InvalidTerm', category: 'invalid_category', description: '설명' },
    ]);
    vi.mocked(filterStopWords).mockReturnValue(['ValidTerm']);

    const { extractTerms } = await import('./term-extractor');
    const result = await extractTerms('메일 본문');

    // invalid category는 필터링되고 ValidTerm만 남음
    const names = result.map(t => t.name);
    expect(names).toContain('ValidTerm');
    expect(names).not.toContain('InvalidTerm');
  });

  it('JSON 파싱 실패(PARSE_ERROR) 시 빈 배열 반환', async () => {
    const { generateContent, parseJsonResponse, GeminiError } = await import('./gemini-client');

    vi.mocked(generateContent).mockResolvedValue('invalid json');
    vi.mocked(parseJsonResponse).mockImplementation(() => {
      throw new GeminiError('파싱 실패', 'PARSE_ERROR');
    });

    const { extractTerms } = await import('./term-extractor');
    const result = await extractTerms('메일 본문');

    expect(result).toEqual([]);
  });

  it('불용어 필터링 후 결과 반환', async () => {
    const { generateContent, parseJsonResponse } = await import('./gemini-client');
    const { getStopWords, filterStopWords } = await import('./stopword-filter');

    vi.mocked(generateContent).mockResolvedValue('["raw"]');
    vi.mocked(parseJsonResponse).mockReturnValue([
      { name: 'EMR', category: 'emr', description: '전자의무기록' },
      { name: '불용어', category: 'general', description: '설명' },
    ]);
    // 불용어 필터링: '불용어' 제거
    vi.mocked(filterStopWords).mockReturnValue(['EMR']);

    const { extractTerms } = await import('./term-extractor');
    const result = await extractTerms('메일 본문');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('EMR');
  });
});
