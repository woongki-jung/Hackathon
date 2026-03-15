import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseJsonResponse, generateContent, GeminiError } from './gemini-client';

// 최상위 레벨에서 모킹 (hoisting 요건 충족)
vi.mock('@/lib/config/settings-service', () => ({
  getSetting: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/http/retry', () => ({
  withRetry: vi.fn().mockImplementation((fn: () => Promise<unknown>) => fn()),
}));
vi.mock('@google/generative-ai', () => {
  const mockGetGenerativeModel = vi.fn().mockReturnValue({
    generateContent: vi.fn().mockResolvedValue({
      response: { text: () => '{"result": "ok"}' },
    }),
  });
  class MockGoogleGenerativeAI {
    getGenerativeModel = mockGetGenerativeModel;
  }
  return { GoogleGenerativeAI: MockGoogleGenerativeAI };
});

// --- parseJsonResponse 순수 함수 테스트 ---
describe('parseJsonResponse', () => {
  it('정상 JSON 문자열 파싱', () => {
    const result = parseJsonResponse<{ name: string }>('{"name": "test"}');
    expect(result).toEqual({ name: 'test' });
  });

  it('```json 코드 블록 마커 제거 후 파싱', () => {
    const result = parseJsonResponse<string[]>('```json\n["a", "b"]\n```');
    expect(result).toEqual(['a', 'b']);
  });

  it('``` 마커만 있는 경우 제거 후 파싱', () => {
    const result = parseJsonResponse<{ x: number }>('```\n{"x": 1}\n```');
    expect(result).toEqual({ x: 1 });
  });

  it('JSON 배열 파싱', () => {
    const result = parseJsonResponse<unknown[]>('[1, 2, 3]');
    expect(result).toEqual([1, 2, 3]);
  });

  it('파싱 실패 시 GeminiError(PARSE_ERROR) throw', () => {
    expect(() => parseJsonResponse('not valid json')).toThrow(GeminiError);
    expect(() => parseJsonResponse('not valid json')).toThrow(
      expect.objectContaining({ code: 'PARSE_ERROR' })
    );
  });

  it('빈 문자열이면 GeminiError throw', () => {
    expect(() => parseJsonResponse('')).toThrow(GeminiError);
  });
});

// --- generateContent 테스트 (API 키 모킹) ---
describe('generateContent', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('GEMINI_API_KEY 미설정 시 NO_API_KEY 에러 throw', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(generateContent('test prompt')).rejects.toThrow(
      expect.objectContaining({ code: 'NO_API_KEY' })
    );
  });

  it('GEMINI_API_KEY 설정 시 모킹된 응답 반환', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const result = await generateContent('test prompt');
    expect(typeof result).toBe('string');
  });
});
