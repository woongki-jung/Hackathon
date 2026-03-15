// Gemini API 호출 래퍼
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSetting } from '@/lib/config/settings-service';
import { withRetry } from '@/lib/http/retry';
import { logger } from '@/lib/logger';

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly code: 'NO_API_KEY' | 'API_ERROR' | 'PARSE_ERROR'
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

/**
 * Gemini API에 프롬프트를 전송하고 텍스트 응답을 반환합니다.
 * API 키 미설정 시 NO_API_KEY 에러를 던집니다.
 */
export async function generateContent(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError('GEMINI_API_KEY 환경변수가 설정되지 않았습니다.', 'NO_API_KEY');
  }

  const modelName = (await getSetting('analysis.model')) ?? process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';

  logger.info('[gemini-client] API 호출', { model: modelName, promptLength: prompt.length });

  return withRetry(async () => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    logger.info('[gemini-client] 응답 수신', { responseLength: text.length });
    return text;
  }, { maxAttempts: 3, baseDelayMs: 2000 });
}

/**
 * Gemini 응답에서 JSON 코드 블록 마커를 제거하고 파싱합니다.
 */
export function parseJsonResponse<T>(text: string): T {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new GeminiError(`JSON 파싱 실패: ${cleaned.slice(0, 200)}`, 'PARSE_ERROR');
  }
}
