// TERM-EXT-001 + TERM-CLS-001: 용어 추출 및 분류
import { generateContent, parseJsonResponse, GeminiError } from './gemini-client';
import { filterStopWords, getStopWords } from './stopword-filter';
import { logger } from '@/lib/logger';

export type TermCategory = 'emr' | 'business' | 'abbreviation' | 'general';

export interface ExtractedTerm {
  name: string;
  category: TermCategory;
  description: string;
}

const VALID_CATEGORIES: TermCategory[] = ['emr', 'business', 'abbreviation', 'general'];

const EXTRACTION_PROMPT = (text: string) => `
당신은 의료/업무 도메인 전문가입니다. 아래 메일 본문에서 업무 용어를 추출해 주세요.

**추출 대상:**
- EMR/의료 시스템 관련 용어 (카테고리: emr)
- 비즈니스/업무 프로세스 용어 (카테고리: business)
- 약어/축약어 (카테고리: abbreviation)
- 기타 도메인 특화 용어 (카테고리: general)

**제외 대상:**
- 일반 한국어 단어 (명사, 동사 등)
- 인명, 지명
- 단순 날짜/숫자

**출력 형식 (JSON 배열, 다른 텍스트 없이):**
[
  {"name": "용어명", "category": "emr|business|abbreviation|general", "description": "한국어 해설 (2~3문장)"}
]

**메일 본문:**
${text.slice(0, 3000)}
`.trim();

/**
 * 메일 본문에서 업무 용어를 추출하고 불용어를 필터링합니다.
 */
export async function extractTerms(textBody: string): Promise<ExtractedTerm[]> {
  const prompt = EXTRACTION_PROMPT(textBody);
  const raw = await generateContent(prompt);

  let terms: ExtractedTerm[] = [];

  try {
    const parsed = parseJsonResponse<unknown[]>(raw);
    terms = parsed
      .filter((item): item is ExtractedTerm => {
        if (typeof item !== 'object' || item === null) return false;
        const t = item as Record<string, unknown>;
        return (
          typeof t.name === 'string' &&
          typeof t.category === 'string' &&
          typeof t.description === 'string' &&
          VALID_CATEGORIES.includes(t.category as TermCategory)
        );
      })
      .map((t) => ({
        name: t.name.trim(),
        category: t.category as TermCategory,
        description: t.description.trim(),
      }));
  } catch (err) {
    if (err instanceof GeminiError && err.code === 'PARSE_ERROR') {
      logger.warn('[term-extractor] JSON 파싱 실패 — 빈 배열 반환', { error: err.message });
      return [];
    }
    throw err;
  }

  // 불용어 필터링
  const stopWordSet = await getStopWords();
  const termNames = terms.map((t) => t.name);
  const filtered = filterStopWords(termNames, stopWordSet);
  const filteredSet = new Set(filtered);
  const result = terms.filter((t) => filteredSet.has(t.name));

  logger.info('[term-extractor] 용어 추출 완료', {
    total: terms.length,
    afterFilter: result.length,
  });

  return result;
}
