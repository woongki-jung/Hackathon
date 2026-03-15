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
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('generateMailAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('정상 응답 — summary와 actionItems 반환', async () => {
    const { generateContent, parseJsonResponse } = await import('./gemini-client');

    vi.mocked(generateContent).mockResolvedValue('{"summary":"요약","actionItems":["작업1","작업2"]}');
    vi.mocked(parseJsonResponse).mockReturnValue({
      summary: '메일 핵심 요약입니다.',
      actionItems: ['후속 작업 1', '후속 작업 2'],
    });

    const { generateMailAnalysis } = await import('./description-generator');
    const result = await generateMailAnalysis('메일 본문 텍스트');

    expect(result.summary).toBe('메일 핵심 요약입니다.');
    expect(result.actionItems).toEqual(['후속 작업 1', '후속 작업 2']);
  });

  it('summary 500자 초과 시 잘라냄', async () => {
    const { generateContent, parseJsonResponse } = await import('./gemini-client');
    const longSummary = 'A'.repeat(600);

    vi.mocked(generateContent).mockResolvedValue('raw');
    vi.mocked(parseJsonResponse).mockReturnValue({
      summary: longSummary,
      actionItems: [],
    });

    const { generateMailAnalysis } = await import('./description-generator');
    const result = await generateMailAnalysis('메일 본문');

    expect(result.summary.length).toBeLessThanOrEqual(500);
  });

  it('actionItems 5개 초과 시 5개로 제한', async () => {
    const { generateContent, parseJsonResponse } = await import('./gemini-client');

    vi.mocked(generateContent).mockResolvedValue('raw');
    vi.mocked(parseJsonResponse).mockReturnValue({
      summary: '요약',
      actionItems: ['1', '2', '3', '4', '5', '6', '7'],
    });

    const { generateMailAnalysis } = await import('./description-generator');
    const result = await generateMailAnalysis('메일 본문');

    expect(result.actionItems).toHaveLength(5);
  });

  it('JSON 파싱 실패 시 원문 텍스트를 summary로, actionItems 빈 배열 반환', async () => {
    const { generateContent, parseJsonResponse, GeminiError } = await import('./gemini-client');
    const rawText = '파싱되지 않는 원문 텍스트';

    vi.mocked(generateContent).mockResolvedValue(rawText);
    vi.mocked(parseJsonResponse).mockImplementation(() => {
      throw new GeminiError('파싱 실패', 'PARSE_ERROR');
    });

    const { generateMailAnalysis } = await import('./description-generator');
    const result = await generateMailAnalysis('메일 본문');

    expect(result.summary).toBe(rawText);
    expect(result.actionItems).toEqual([]);
  });

  it('actionItems가 배열이 아니면 빈 배열 반환', async () => {
    const { generateContent, parseJsonResponse } = await import('./gemini-client');

    vi.mocked(generateContent).mockResolvedValue('raw');
    vi.mocked(parseJsonResponse).mockReturnValue({
      summary: '요약',
      actionItems: 'not an array',
    });

    const { generateMailAnalysis } = await import('./description-generator');
    const result = await generateMailAnalysis('메일 본문');

    expect(result.actionItems).toEqual([]);
  });
});
