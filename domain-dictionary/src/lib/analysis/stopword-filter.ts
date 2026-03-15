// TERM-EXT-002: 불용어 필터링
import { db } from '@/db';
import { stopWords } from '@/db/schema';

/**
 * stop_words 테이블에서 불용어 목록을 가져옵니다.
 */
export function getStopWords(): Set<string> {
  const rows = db.select({ word: stopWords.word }).from(stopWords).all();
  return new Set(rows.map((r) => r.word.toLowerCase()));
}

/**
 * 추출된 용어 목록에서 불용어를 제거합니다.
 */
export function filterStopWords(terms: string[], stopWordSet: Set<string>): string[] {
  return terms.filter((term) => !stopWordSet.has(term.toLowerCase().trim()));
}
