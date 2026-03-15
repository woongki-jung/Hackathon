import path from 'path';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { terms } from '@/db/schema';
import { requireAdmin, isNextResponse } from '@/lib/auth/require-admin';
import { writeFile } from '@/lib/fs/file-manager';
import { logger } from '@/lib/logger';
import fs from 'fs';

export const runtime = 'nodejs';

const GLOSSARY_DIR = process.env.GLOSSARY_STORAGE_PATH ?? './data/terms';

function toSafeFileName(termName: string): string {
  return termName.replace(/[/\\?%*:|"<>]/g, '_');
}

function buildGlossaryMarkdown(term: {
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

// DATA-DICT-002: DB-파일 동기화 (파일 없는 용어 재생성)
export async function POST() {
  const sessionOrResponse = await requireAdmin();
  if (isNextResponse(sessionOrResponse)) return sessionOrResponse;

  try {
    const allTerms = db.select().from(terms).all();

    let synced = 0;
    let skipped = 0;

    for (const term of allTerms) {
      const filePath = path.join(GLOSSARY_DIR, `${toSafeFileName(term.name)}.md`);
      if (!fs.existsSync(filePath)) {
        const content = buildGlossaryMarkdown({
          name: term.name,
          category: term.category ?? 'general',
          description: term.description,
          frequency: term.frequency,
          updatedAt: term.updatedAt,
        });
        writeFile(filePath, content);
        synced++;
      } else {
        skipped++;
      }
    }

    logger.info('[api/admin/sync-terms] 동기화 완료', { synced, skipped, total: allTerms.length });

    return NextResponse.json({
      success: true,
      data: { total: allTerms.length, synced, skipped },
    });
  } catch (err) {
    logger.error('[api/admin/sync-terms] 오류', { error: String(err) });
    return NextResponse.json({ success: false, message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
