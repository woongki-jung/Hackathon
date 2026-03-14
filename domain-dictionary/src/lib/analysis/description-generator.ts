// TERM-GEN-001: 메일 요약 및 후속 작업 생성
import { generateContent, parseJsonResponse, GeminiError } from './gemini-client';
import { logger } from '@/lib/logger';

export interface MailAnalysis {
  summary: string;
  actionItems: string[];
}

const SUMMARY_PROMPT = (text: string) => `
당신은 업무 메일 분석 전문가입니다. 아래 메일 본문을 분석하여 요약과 후속 작업을 추출해 주세요.

**출력 형식 (JSON, 다른 텍스트 없이):**
{
  "summary": "메일 핵심 내용 요약 (500자 이내, 한국어)",
  "actionItems": ["후속 작업 1", "후속 작업 2", ...] // 최대 5개, 구체적인 행동 항목
}

**메일 본문:**
${text.slice(0, 3000)}
`.trim();

/**
 * 메일 본문을 요약하고 후속 작업을 추출합니다.
 */
export async function generateMailAnalysis(textBody: string): Promise<MailAnalysis> {
  const prompt = SUMMARY_PROMPT(textBody);
  const raw = await generateContent(prompt);

  try {
    const parsed = parseJsonResponse<{ summary?: string; actionItems?: unknown[] }>(raw);

    const summary = typeof parsed.summary === 'string'
      ? parsed.summary.slice(0, 500)
      : '';

    const actionItems = Array.isArray(parsed.actionItems)
      ? parsed.actionItems
          .filter((item): item is string => typeof item === 'string')
          .slice(0, 5)
      : [];

    logger.info('[description-generator] 메일 분석 완료', {
      summaryLength: summary.length,
      actionItemCount: actionItems.length,
    });

    return { summary, actionItems };
  } catch (err) {
    if (err instanceof GeminiError && err.code === 'PARSE_ERROR') {
      logger.warn('[description-generator] JSON 파싱 실패 — 기본값 반환');
      return { summary: raw.slice(0, 500), actionItems: [] };
    }
    throw err;
  }
}
