// DATA-DICT-001: 용어 사전 저장소
import path from 'path';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { terms, termSourceFiles } from '@/db/schema';
import { writeFile } from '@/lib/fs/file-manager';
import { logger } from '@/lib/logger';
import type { ExtractedTerm } from '@/lib/analysis/term-extractor';

const GLOSSARY_DIR = process.env.GLOSSARY_STORAGE_PATH ?? './data/terms';

/**
 * 용어명을 안전한 파일명으로 변환합니다.
 */
export function toSafeFileName(termName: string): string {
  return termName.replace(/[/\\?%*:|"<>]/g, '_');
}

/**
 * 용어 해설집 마크다운 파일 내용을 생성합니다.
 */
export function buildGlossaryMarkdown(term: {
  name: string;
  category: string;
  description: string;
  frequency: number;
  updatedAt: string;
}): string {
  const categoryLabel: Record<string, string> = {
    emr: 'EMR',
    business: '비즈니스',
    abbreviation: '약어',
    general: '일반',
  };

  return [
    `# ${term.name}`,
    '',
    `- **카테고리**: ${categoryLabel[term.category] ?? term.category}`,
    `- **등장 빈도**: ${term.frequency}회`,
    `- **최근 갱신**: ${term.updatedAt}`,
    '',
    '## 해설',
    '',
    term.description,
    '',
  ].join('\n');
}

export interface SaveTermResult {
  termId: string;
  isNew: boolean;
}

/**
 * 추출된 용어를 DB에 저장(upsert)하고 해설집 파일을 생성합니다.
 * - 신규: INSERT
 * - 기존: 빈도 증가 + 해설 업데이트
 */
export async function saveTerm(
  term: ExtractedTerm,
  source: { fileName: string; sourceDescription: string | null; receivedAt: string | null }
): Promise<SaveTermResult> {
  const now = new Date().toISOString();
  const [existing] = await db.select().from(terms).where(eq(terms.name, term.name));

  let termId: string;
  let isNew: boolean;

  if (existing) {
    // 기존 용어: 빈도 증가 + 해설 업데이트
    const newFrequency = existing.frequency + 1;
    await db.update(terms)
      .set({
        description: term.description,
        category: term.category,
        frequency: newFrequency,
        lastSourceDescription: source.sourceDescription,
        lastSourceDate: source.receivedAt,
        updatedAt: now,
      })
      .where(eq(terms.id, existing.id));

    termId = existing.id;
    isNew = false;
    logger.info('[dictionary-store] 용어 업데이트', { name: term.name, frequency: newFrequency });
  } else {
    // 신규 용어: INSERT
    const [inserted] = await db.insert(terms)
      .values({
        name: term.name,
        category: term.category,
        description: term.description,
        frequency: 1,
        lastSourceDescription: source.sourceDescription,
        lastSourceDate: source.receivedAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: terms.id });

    termId = inserted.id;
    isNew = true;
    logger.info('[dictionary-store] 용어 신규 저장', { name: term.name });
  }

  // 출처 파일 기록 (중복 무시)
  try {
    await db.insert(termSourceFiles)
      .values({
        termId,
        sourceFileName: source.fileName,
        sourceDescription: source.sourceDescription,
        receivedAt: source.receivedAt,
        createdAt: now,
      });
  } catch {
    // unique constraint 위반 시 무시
  }

  // 해설집 파일 저장
  const [latest] = await db.select().from(terms).where(eq(terms.id, termId));
  if (latest) {
    const mdContent = buildGlossaryMarkdown({
      name: latest.name,
      category: latest.category ?? 'general',
      description: latest.description,
      frequency: latest.frequency,
      updatedAt: latest.updatedAt,
    });
    const filePath = path.join(GLOSSARY_DIR, `${toSafeFileName(latest.name)}.md`);
    writeFile(filePath, mdContent);
  }

  return { termId, isNew };
}
