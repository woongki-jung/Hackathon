import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { sessionOptions, type SessionData } from '@/lib/auth/session';
import { VALID_CATEGORIES } from '@/lib/utils/category';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const PAGE_SIZE = 20;

// DICT-001: 용어 검색 (PostgreSQL FTS + 카테고리 필터 + 페이지네이션)
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

  try {
    let rows: { id: string; name: string; category: string | null; description: string; frequency: number; updatedAt: string; snippet: string | null }[];
    let totalCount: number;

    const catFilter = VALID_CATEGORIES.includes(category as never) ? category : null;

    if (q) {
      // PostgreSQL FTS 검색: plainto_tsquery + ts_headline 스니펫
      if (catFilter) {
        const ftsResult = await sql.query<{ id: string; name: string; category: string | null; description: string; frequency: number; updatedAt: string; snippet: string | null }>(
          `SELECT
            t.id, t.name, t.category, t.description, t.frequency, t.updated_at as "updatedAt",
            ts_headline('simple', t.description, plainto_tsquery('simple', $1), 'MaxFragments=1,MaxWords=16,MinWords=3') as snippet
          FROM terms t
          WHERE to_tsvector('simple', coalesce(t.name,'') || ' ' || coalesce(t.description,'')) @@ plainto_tsquery('simple', $1)
            AND t.category = $2
          ORDER BY
            ts_rank(to_tsvector('simple', coalesce(t.name,'') || ' ' || coalesce(t.description,'')), plainto_tsquery('simple', $1)) DESC,
            t.frequency DESC
          LIMIT $3 OFFSET $4`,
          [q, catFilter, PAGE_SIZE, offset]
        );
        const countResult = await sql.query<{ cnt: string }>(
          `SELECT COUNT(*) as cnt
          FROM terms t
          WHERE to_tsvector('simple', coalesce(t.name,'') || ' ' || coalesce(t.description,'')) @@ plainto_tsquery('simple', $1)
            AND t.category = $2`,
          [q, catFilter]
        );
        rows = ftsResult.rows;
        totalCount = parseInt(countResult.rows[0]?.cnt ?? '0', 10);
      } else {
        const ftsResult = await sql.query<{ id: string; name: string; category: string | null; description: string; frequency: number; updatedAt: string; snippet: string | null }>(
          `SELECT
            t.id, t.name, t.category, t.description, t.frequency, t.updated_at as "updatedAt",
            ts_headline('simple', t.description, plainto_tsquery('simple', $1), 'MaxFragments=1,MaxWords=16,MinWords=3') as snippet
          FROM terms t
          WHERE to_tsvector('simple', coalesce(t.name,'') || ' ' || coalesce(t.description,'')) @@ plainto_tsquery('simple', $1)
          ORDER BY
            ts_rank(to_tsvector('simple', coalesce(t.name,'') || ' ' || coalesce(t.description,'')), plainto_tsquery('simple', $1)) DESC,
            t.frequency DESC
          LIMIT $2 OFFSET $3`,
          [q, PAGE_SIZE, offset]
        );
        const countResult = await sql.query<{ cnt: string }>(
          `SELECT COUNT(*) as cnt
          FROM terms t
          WHERE to_tsvector('simple', coalesce(t.name,'') || ' ' || coalesce(t.description,'')) @@ plainto_tsquery('simple', $1)`,
          [q]
        );
        rows = ftsResult.rows;
        totalCount = parseInt(countResult.rows[0]?.cnt ?? '0', 10);
      }
    } else {
      // 검색어 없음: 빈도 순 전체 목록
      if (catFilter) {
        const listResult = await sql.query<{ id: string; name: string; category: string | null; description: string; frequency: number; updatedAt: string; snippet: null }>(
          `SELECT id, name, category, description, frequency, updated_at as "updatedAt", NULL as snippet
          FROM terms WHERE category = $1
          ORDER BY frequency DESC LIMIT $2 OFFSET $3`,
          [catFilter, PAGE_SIZE, offset]
        );
        const countResult = await sql.query<{ cnt: string }>(
          `SELECT COUNT(*) as cnt FROM terms WHERE category = $1`,
          [catFilter]
        );
        rows = listResult.rows;
        totalCount = parseInt(countResult.rows[0]?.cnt ?? '0', 10);
      } else {
        const listResult = await sql.query<{ id: string; name: string; category: string | null; description: string; frequency: number; updatedAt: string; snippet: null }>(
          `SELECT id, name, category, description, frequency, updated_at as "updatedAt", NULL as snippet
          FROM terms
          ORDER BY frequency DESC LIMIT $1 OFFSET $2`,
          [PAGE_SIZE, offset]
        );
        const countResult = await sql.query<{ cnt: string }>(
          `SELECT COUNT(*) as cnt FROM terms`
        );
        rows = listResult.rows;
        totalCount = parseInt(countResult.rows[0]?.cnt ?? '0', 10);
      }
    }

    // 해설 미리보기 200자, snippet null 정규화
    const items = rows.map((r) => ({
      ...r,
      description: r.description.length > 200 ? r.description.slice(0, 200) + '…' : r.description,
      snippet: r.snippet ?? null,
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
