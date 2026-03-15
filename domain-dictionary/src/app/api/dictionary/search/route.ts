import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sessionOptions, type SessionData } from '@/lib/auth/session';
import { VALID_CATEGORIES } from '@/lib/utils/category';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const PAGE_SIZE = 20;

// FTS5 쿼리용 특수문자 이스케이프
function sanitizeFts(query: string): string {
  return query.replace(/["*^()]/g, ' ').trim();
}

// DICT-001: 용어 검색 (FTS5 전문 검색 + 카테고리 필터 + 페이지네이션)
export async function GET(request: Request) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId) {
    return NextResponse.json({ success: false, message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const category = searchParams.get('category') ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  const sqlite = db.$client;

  try {
    let rows: { id: string; name: string; category: string | null; description: string; frequency: number; updatedAt: string }[];
    let totalCount: number;

    const catFilter = VALID_CATEGORIES.includes(category as never) ? category : null;

    if (q) {
      const safeQ = sanitizeFts(q);
      if (!safeQ) {
        return NextResponse.json({ success: true, data: { items: [], pagination: { page, pageSize: PAGE_SIZE, total: 0, totalPages: 0 } } });
      }

      // FTS5 검색: MATCH + 카테고리 필터
      const ftsQuery = catFilter
        ? `SELECT t.id, t.name, t.category, t.description, t.frequency, t.updated_at as updatedAt
           FROM terms_fts fts
           JOIN terms t ON fts.rowid = t.rowid
           WHERE terms_fts MATCH ? AND t.category = ? AND t.deleted_at IS NULL
           ORDER BY bm25(terms_fts), t.frequency DESC
           LIMIT ? OFFSET ?`
        : `SELECT t.id, t.name, t.category, t.description, t.frequency, t.updated_at as updatedAt
           FROM terms_fts fts
           JOIN terms t ON fts.rowid = t.rowid
           WHERE terms_fts MATCH ?
           ORDER BY bm25(terms_fts), t.frequency DESC
           LIMIT ? OFFSET ?`;

      const countQuery = catFilter
        ? `SELECT COUNT(*) as cnt FROM terms_fts fts JOIN terms t ON fts.rowid = t.rowid WHERE terms_fts MATCH ? AND t.category = ?`
        : `SELECT COUNT(*) as cnt FROM terms_fts fts JOIN terms t ON fts.rowid = t.rowid WHERE terms_fts MATCH ?`;

      const ftsArgs = catFilter ? [safeQ, catFilter] : [safeQ];
      rows = catFilter
        ? sqlite.prepare(ftsQuery).all(safeQ, catFilter, PAGE_SIZE, offset) as typeof rows
        : sqlite.prepare(ftsQuery).all(safeQ, PAGE_SIZE, offset) as typeof rows;

      const countRow = sqlite.prepare(countQuery).get(...ftsArgs) as { cnt: number };
      totalCount = countRow?.cnt ?? 0;
    } else {
      // 검색어 없음: 빈도 순 전체 목록
      const listQuery = catFilter
        ? `SELECT id, name, category, description, frequency, updated_at as updatedAt FROM terms WHERE category = ? ORDER BY frequency DESC LIMIT ? OFFSET ?`
        : `SELECT id, name, category, description, frequency, updated_at as updatedAt FROM terms ORDER BY frequency DESC LIMIT ? OFFSET ?`;

      const countQuery = catFilter
        ? `SELECT COUNT(*) as cnt FROM terms WHERE category = ?`
        : `SELECT COUNT(*) as cnt FROM terms`;

      rows = catFilter
        ? sqlite.prepare(listQuery).all(catFilter, PAGE_SIZE, offset) as typeof rows
        : sqlite.prepare(listQuery).all(PAGE_SIZE, offset) as typeof rows;

      const countRow = catFilter
        ? sqlite.prepare(countQuery).get(catFilter) as { cnt: number }
        : sqlite.prepare(countQuery).get() as { cnt: number };
      totalCount = countRow?.cnt ?? 0;
    }

    // 해설 미리보기 200자
    const items = rows.map((r) => ({
      ...r,
      description: r.description.length > 200 ? r.description.slice(0, 200) + '…' : r.description,
    }));

    logger.info('[api/dictionary/search] 검색', { q, category: catFilter, page, count: items.length });

    return NextResponse.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          pageSize: PAGE_SIZE,
          total: totalCount,
          totalPages: Math.ceil(totalCount / PAGE_SIZE),
        },
      },
    });
  } catch (err) {
    logger.error('[api/dictionary/search] 오류', { error: String(err) });
    return NextResponse.json({ success: false, message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
