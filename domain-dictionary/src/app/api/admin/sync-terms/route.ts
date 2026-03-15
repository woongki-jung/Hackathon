import path from 'path';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { terms } from '@/db/schema';
import { requireAdmin, isNextResponse } from '@/lib/auth/require-admin';
import { writeFile, fileExists } from '@/lib/fs/file-manager';
import { buildGlossaryMarkdown, toSafeFileName } from '@/lib/dictionary/dictionary-store';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const GLOSSARY_DIR = process.env.GLOSSARY_STORAGE_PATH ?? './data/terms';

// DATA-DICT-002: DB-파일 동기화 (파일 없는 용어 재생성)
export async function POST() {
  const sessionOrResponse = await requireAdmin();
  if (isNextResponse(sessionOrResponse)) return sessionOrResponse;

  try {
    const allTerms = await db.select().from(terms);

    let synced = 0;
    let skipped = 0;

    for (const term of allTerms) {
      const filePath = path.join(GLOSSARY_DIR, `${toSafeFileName(term.name)}.md`);
      if (!fileExists(filePath)) {
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
