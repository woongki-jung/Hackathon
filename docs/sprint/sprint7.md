# Sprint 7: 용어사전 뷰어 + 검색 + 트렌드 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 용어사전 검색 API(FTS5), 트렌드 API, 용어 상세 API를 구현하고, 검색 뷰어 화면과 용어 상세 화면을 완성하여 Phase 4 첫 번째 스프린트를 완료한다.

**Architecture:** API 3개(search/trending/terms/:id)를 각각 독립 Route Handler로 구현하고, 두 개의 Client Component 화면(dictionary/page.tsx, dictionary/[id]/page.tsx)에서 fetch + useSearchParams로 URL 파라미터를 동기화한다. 검색 디바운스는 클라이언트(300ms), FTS5 쿼리와 해설 200자 미리보기 자르기는 서버에서 처리한다.

**Tech Stack:** Next.js App Router (Client Component), better-sqlite3 + Drizzle ORM (FTS5 raw SQL), iron-session 인증, Tailwind CSS, useSearchParams / useRouter (URL 동기화)

---

## 스프린트 개요

- **스프린트 번호:** Sprint 7
- **기간:** 2주
- **목표:** 용어사전 전체 조회/검색/상세 기능 완성 (Phase 4 시작)
- **선행 조건:** Sprint 6 완료 — `terms`, `termSourceFiles` 테이블 및 FTS5 가상 테이블 `terms_fts` 존재

## 구현 범위

### 포함 항목
- T7-1: 용어 검색 API (`GET /api/dictionary/search`)
- T7-2: 빈도 트렌드 API (`GET /api/dictionary/trending`)
- T7-3: 용어 상세 API (`GET /api/dictionary/terms/[id]`)
- T7-4: 용어사전 뷰어 화면 (`/dictionary`)
- T7-5: 용어 상세 화면 (`/dictionary/[id]`)

### 제외 항목
- 용어 수동 편집 기능 (Backlog)
- 불용어 관리 UI (Backlog)
- 메일 원본 보기 (Backlog)

---

## Task 1: 용어 검색 API (T7-1)

**Files:**
- Create: `domain-dictionary/src/app/api/dictionary/search/route.ts`

**Step 1: route.ts 파일 생성**

```typescript
// domain-dictionary/src/app/api/dictionary/search/route.ts
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sessionOptions, type SessionData } from '@/lib/auth/session';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const PAGE_SIZE = 20;

// DICT-001: 용어 검색 API (FTS5 전문 검색, 카테고리 필터, 페이지네이션)
export async function GET(request: Request) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId) {
    return NextResponse.json({ success: false, message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();
  const category = (searchParams.get('category') ?? '').trim();
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  try {
    // SQLite raw() 접근 — Drizzle ORM은 FTS5 매치 쿼리를 직접 지원하지 않으므로
    // better-sqlite3 인스턴스를 통해 raw SQL로 실행
    const sqlite = (db as unknown as { session: { driver: import('better-sqlite3').Database } }).session?.driver
      ?? (db as unknown as { $client: import('better-sqlite3').Database }).$client;

    let items: unknown[];
    let total: number;

    if (q) {
      // FTS5 쿼리: 관련도 우선, 동일 관련도면 빈도 내림차순
      // FTS5 MATCH는 쿼리 문자열에 특수문자가 있으면 에러이므로 이스케이프 처리
      const escapedQ = q.replace(/['"*^()]/g, ' ').trim();
      const ftsQuery = escapedQ ? `${escapedQ}*` : '';

      if (ftsQuery) {
        const categoryFilter = category ? 'AND t.category = ?' : '';
        const countParams = category ? [ftsQuery, category] : [ftsQuery];
        const queryParams = category ? [ftsQuery, category, PAGE_SIZE, offset] : [ftsQuery, PAGE_SIZE, offset];

        const countRow = sqlite.prepare(`
          SELECT COUNT(*) as cnt
          FROM terms t
          JOIN terms_fts ON terms_fts.rowid = t.rowid
          WHERE terms_fts MATCH ?
          ${categoryFilter}
        `).get(...countParams) as { cnt: number };

        total = countRow.cnt;

        items = sqlite.prepare(`
          SELECT
            t.id,
            t.name,
            t.category,
            SUBSTR(t.description, 1, 200) AS description_preview,
            t.frequency,
            t.updatedAt,
            rank
          FROM terms t
          JOIN terms_fts ON terms_fts.rowid = t.rowid
          WHERE terms_fts MATCH ?
          ${categoryFilter}
          ORDER BY rank, t.frequency DESC
          LIMIT ? OFFSET ?
        `).all(...queryParams);
      } else {
        // 이스케이프 후 쿼리가 비어있으면 전체 조회로 폴백
        items = [];
        total = 0;
      }
    } else {
      // 검색어 없으면 전체 조회 (빈도 내림차순)
      const categoryFilter = category ? 'WHERE category = ?' : '';
      const countParams = category ? [category] : [];
      const queryParams = category ? [category, PAGE_SIZE, offset] : [PAGE_SIZE, offset];

      const countRow = sqlite.prepare(`
        SELECT COUNT(*) as cnt FROM terms ${categoryFilter}
      `).get(...countParams) as { cnt: number };

      total = countRow.cnt;

      items = sqlite.prepare(`
        SELECT
          id,
          name,
          category,
          SUBSTR(description, 1, 200) AS description_preview,
          frequency,
          updatedAt
        FROM terms
        ${categoryFilter}
        ORDER BY frequency DESC
        LIMIT ? OFFSET ?
      `).all(...queryParams);
    }

    logger.info('[api/dictionary/search] 검색', { userId: session.userId, q, category, page });

    return NextResponse.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          pageSize: PAGE_SIZE,
          total,
          totalPages: Math.ceil(total / PAGE_SIZE),
        },
      },
    });
  } catch (err) {
    logger.error('[api/dictionary/search] 오류', { err: String(err) });
    return NextResponse.json({ success: false, message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
```

**Step 2: DB 인스턴스 접근 방식 확인**

`src/db/index.ts`에서 `drizzle(sqlite, { schema })` 형태로 반환하므로, raw SQL 실행을 위해 better-sqlite3 인스턴스에 접근해야 합니다.

Drizzle ORM의 `db` 객체에서 내부 SQLite 드라이버에 접근하는 올바른 방법:
```typescript
// Drizzle better-sqlite3 드라이버에서 raw Database 접근
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

// db.$client 또는 내부 session.driver 로 접근 가능
// drizzle-orm/better-sqlite3의 db.$client가 better-sqlite3 인스턴스
```

실제 코드에서는 `db.$client`를 사용합니다. `src/db/index.ts`를 수정하거나 별도 sqlite 인스턴스를 export하는 것이 더 명확합니다.

**Step 3: src/db/index.ts에 sqlite raw 인스턴스 export 추가**

`src/db/index.ts`에 다음 export를 추가합니다:
```typescript
// raw better-sqlite3 인스턴스 (FTS5 raw SQL 용)
export const sqlite = db.$client as unknown as import('better-sqlite3').Database;
```

단, `$client`가 타입에 노출되지 않는다면 별도 싱글톤 변수로 관리합니다:
```typescript
// HMR 중복 방지를 위해 global에도 저장
declare global {
  var __sqlite: import('better-sqlite3').Database | undefined;
}
```

실제 구현 시 `src/db/index.ts`를 읽고 정확한 구조를 확인 후 결정합니다.

**Step 4: 검색 API 동작 확인**

개발 서버 실행 후:
```
GET /api/dictionary/search?q=EMR&page=1
GET /api/dictionary/search?q=EMR&category=emr&page=1
GET /api/dictionary/search&page=1  (전체 조회)
```
응답 구조:
```json
{
  "success": true,
  "data": {
    "items": [{ "id": "...", "name": "...", "category": "emr", "description_preview": "...", "frequency": 5, "updatedAt": "..." }],
    "pagination": { "page": 1, "pageSize": 20, "total": 42, "totalPages": 3 }
  }
}
```

**Step 5: Commit**

```bash
git add domain-dictionary/src/app/api/dictionary/search/route.ts
git commit -m "feat: 용어 검색 API 구현 (FTS5 전문 검색, 카테고리 필터, 페이지네이션)"
```

---

## Task 2: 빈도 트렌드 API (T7-2)

**Files:**
- Create: `domain-dictionary/src/app/api/dictionary/trending/route.ts`

**Step 1: route.ts 파일 생성**

```typescript
// domain-dictionary/src/app/api/dictionary/trending/route.ts
import { desc } from 'drizzle-orm';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { terms } from '@/db/schema';
import { sessionOptions, type SessionData } from '@/lib/auth/session';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

// DICT-002: 빈도 상위 10개 용어 목록
export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId) {
    return NextResponse.json({ success: false, message: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const items = db
      .select({
        id: terms.id,
        name: terms.name,
        category: terms.category,
        frequency: terms.frequency,
      })
      .from(terms)
      .orderBy(desc(terms.frequency))
      .limit(10)
      .all();

    logger.info('[api/dictionary/trending] 트렌드 조회', { userId: session.userId });

    return NextResponse.json({ success: true, data: { items } });
  } catch (err) {
    logger.error('[api/dictionary/trending] 오류', { err: String(err) });
    return NextResponse.json({ success: false, message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
```

**Step 2: 동작 확인**

```
GET /api/dictionary/trending
```
응답:
```json
{
  "success": true,
  "data": {
    "items": [{ "id": "...", "name": "EMR", "category": "emr", "frequency": 15 }, ...]
  }
}
```

**Step 3: Commit**

```bash
git add domain-dictionary/src/app/api/dictionary/trending/route.ts
git commit -m "feat: 빈도 트렌드 API 구현 (상위 10개)"
```

---

## Task 3: 용어 상세 API (T7-3)

**Files:**
- Create: `domain-dictionary/src/app/api/dictionary/terms/[id]/route.ts`

**Step 1: route.ts 파일 생성**

```typescript
// domain-dictionary/src/app/api/dictionary/terms/[id]/route.ts
import { desc, eq } from 'drizzle-orm';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { termSourceFiles, terms } from '@/db/schema';
import { sessionOptions, type SessionData } from '@/lib/auth/session';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

// DICT-003: 용어 상세 + 출처 메일 목록 (최신순 최대 10건)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId) {
    return NextResponse.json({ success: false, message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { id } = await params;

  try {
    // 용어 상세 조회
    const term = db
      .select()
      .from(terms)
      .where(eq(terms.id, id))
      .get();

    if (!term) {
      return NextResponse.json(
        { success: false, message: '요청하신 용어를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 출처 메일 목록 (최신순 최대 10건)
    const sources = db
      .select({
        id: termSourceFiles.id,
        mailFileName: termSourceFiles.mailFileName,
        mailSubject: termSourceFiles.mailSubject,
        mailReceivedAt: termSourceFiles.mailReceivedAt,
        createdAt: termSourceFiles.createdAt,
      })
      .from(termSourceFiles)
      .where(eq(termSourceFiles.termId, id))
      .orderBy(desc(termSourceFiles.mailReceivedAt))
      .limit(10)
      .all();

    logger.info('[api/dictionary/terms/:id] 용어 상세 조회', { userId: session.userId, termId: id });

    return NextResponse.json({
      success: true,
      data: { term, sources },
    });
  } catch (err) {
    logger.error('[api/dictionary/terms/:id] 오류', { err: String(err) });
    return NextResponse.json({ success: false, message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
```

**Step 2: 동작 확인**

```
GET /api/dictionary/terms/{valid-uuid}    → 200 + { term: {...}, sources: [...] }
GET /api/dictionary/terms/nonexistent     → 404 + { message: "요청하신 용어를 찾을 수 없습니다." }
```

**Step 3: Commit**

```bash
git add domain-dictionary/src/app/api/dictionary/terms/
git commit -m "feat: 용어 상세 API 구현 (용어 정보 + 출처 메일 최신순 10건)"
```

---

## Task 4: DB 인스턴스 raw SQL 접근 방식 정비 (T7-1 보조)

**Files:**
- Modify: `domain-dictionary/src/db/index.ts`

검색 API(T7-1)의 FTS5 raw SQL 실행을 위해 better-sqlite3 인스턴스를 외부에서 사용할 수 있도록 정비합니다.

**Step 1: index.ts 수정**

`src/db/index.ts`에서 `createDbConnection()` 함수가 반환하는 `drizzle()` 인스턴스는 `$client` 속성으로 내부 better-sqlite3 인스턴스에 접근할 수 있습니다. 이를 export합니다.

```typescript
// 기존 export 아래에 추가
// raw better-sqlite3 인스턴스 (FTS5 raw SQL 쿼리 실행용)
export const getRawSqlite = (): import('better-sqlite3').Database => {
  return (db as unknown as { $client: import('better-sqlite3').Database }).$client;
};
```

**Step 2: 검색 route.ts에서 getRawSqlite 사용**

`src/app/api/dictionary/search/route.ts`에서:
```typescript
import { db, getRawSqlite } from '@/db';
// ...
const sqlite = getRawSqlite();
```

**Step 3: Commit**

```bash
git add domain-dictionary/src/db/index.ts domain-dictionary/src/app/api/dictionary/search/route.ts
git commit -m "refactor: FTS5 raw SQL 접근을 위한 getRawSqlite 헬퍼 추가"
```

---

## Task 5: 카테고리 색상 유틸리티 (T7-4, T7-5 공통)

**Files:**
- Create: `domain-dictionary/src/lib/utils/category.ts`

**Step 1: 유틸리티 파일 생성**

```typescript
// domain-dictionary/src/lib/utils/category.ts

export type TermCategory = 'emr' | 'business' | 'abbreviation' | 'general';

export const CATEGORY_LABEL: Record<string, string> = {
  emr: 'EMR',
  business: '비즈니스',
  abbreviation: '약어',
  general: '일반',
};

export const CATEGORY_BADGE_CLASS: Record<string, string> = {
  emr: 'bg-blue-100 text-blue-700',
  business: 'bg-green-100 text-green-700',
  abbreviation: 'bg-orange-100 text-orange-700',
  general: 'bg-gray-100 text-gray-600',
};

export function getCategoryBadgeClass(category: string | null): string {
  return CATEGORY_BADGE_CLASS[category ?? ''] ?? 'bg-gray-100 text-gray-600';
}

export function getCategoryLabel(category: string | null): string {
  return CATEGORY_LABEL[category ?? ''] ?? (category ?? '기타');
}
```

**Step 2: Commit**

```bash
git add domain-dictionary/src/lib/utils/category.ts
git commit -m "feat: 용어 카테고리 색상/레이블 유틸리티 추가"
```

---

## Task 6: 용어사전 뷰어 화면 (T7-4)

**Files:**
- Create: `domain-dictionary/src/app/(authenticated)/dictionary/page.tsx`

**Step 1: 화면 컴포넌트 생성**

```typescript
// domain-dictionary/src/app/(authenticated)/dictionary/page.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/lib/toast/toast-context';
import { getCategoryBadgeClass, getCategoryLabel } from '@/lib/utils/category';

interface TermItem {
  id: string;
  name: string;
  category: string | null;
  description_preview: string;
  frequency: number;
  updatedAt: string;
}

interface TrendItem {
  id: string;
  name: string;
  category: string | null;
  frequency: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const CATEGORIES = [
  { value: '', label: '전체' },
  { value: 'emr', label: 'EMR' },
  { value: 'business', label: '비즈니스' },
  { value: 'abbreviation', label: '약어' },
  { value: 'general', label: '일반' },
];

function formatDate(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso)
    .toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
    .replace(/\. /g, '-').replace('.', '').trim();
}

export default function DictionaryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  // URL 파라미터에서 초기값 읽기
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? '1'));

  const [items, setItems] = useState<TermItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendsLoading, setTrendsLoading] = useState(true);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 트렌드 데이터 초기 로드
  useEffect(() => {
    fetch('/api/dictionary/trending')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setTrends(json.data.items);
      })
      .catch(() => addToast('error', '트렌드 데이터를 불러오지 못했습니다.'))
      .finally(() => setTrendsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 검색 실행 함수
  const doSearch = useCallback(
    async (q: string, cat: string, p: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (cat) params.set('category', cat);
        params.set('page', String(p));

        const res = await fetch(`/api/dictionary/search?${params.toString()}`);
        const json = await res.json();
        if (json.success) {
          setItems(json.data.items);
          setPagination(json.data.pagination);
        } else {
          addToast('error', json.message ?? '검색에 실패했습니다.');
        }
      } catch {
        addToast('error', '서버 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // URL 파라미터 동기화 함수
  const syncUrl = useCallback(
    (q: string, cat: string, p: number) => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (cat) params.set('category', cat);
      if (p > 1) params.set('page', String(p));
      const newUrl = `/dictionary${params.toString() ? `?${params.toString()}` : ''}`;
      router.replace(newUrl, { scroll: false });
    },
    [router]
  );

  // 검색어 변경 시 300ms 디바운스
  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      syncUrl(value, category, 1);
      doSearch(value, category, 1);
    }, 300);
  };

  // 카테고리 변경
  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setPage(1);
    syncUrl(query, value, 1);
    doSearch(query, value, 1);
  };

  // 페이지 변경
  const handlePageChange = (p: number) => {
    setPage(p);
    syncUrl(query, category, p);
    doSearch(query, category, p);
  };

  // 초기 로드 (URL 파라미터 기반)
  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    const cat = searchParams.get('category') ?? '';
    const p = Number(searchParams.get('page') ?? '1');
    doSearch(q, cat, p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">용어사전</h1>

      {/* 검색 입력 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="용어를 검색하세요"
          className="w-full text-lg px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          aria-label="용어 검색"
        />
      </div>

      {/* 카테고리 필터 */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => handleCategoryChange(cat.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              category === cat.value
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 빈도 트렌드 영역 (검색어 없을 때 항상, 검색어 있을 때도 표시) */}
      {!query && (
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">빈도 높은 용어</h2>
          {trendsLoading ? (
            <div className="flex gap-2 flex-wrap">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-7 w-16 bg-gray-100 rounded-full animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {trends.map((t) => (
                <a
                  key={t.id}
                  href={`/dictionary/${t.id}`}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-colors hover:opacity-80 ${getCategoryBadgeClass(t.category)}`}
                >
                  {t.name}
                  <span className="ml-1 text-current opacity-60">{t.frequency}</span>
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 검색 결과 */}
      <section>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
                <div className="h-4 bg-gray-100 rounded w-full mb-1" />
                <div className="h-4 bg-gray-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          query ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-400 text-sm">검색 결과가 없습니다.</p>
            </div>
          ) : null
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <a
                key={item.id}
                href={`/dictionary/${item.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryBadgeClass(item.category)}`}
                    >
                      {getCategoryLabel(item.category)}
                    </span>
                    <span className="text-xs text-gray-400">빈도 {item.frequency}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                  {item.description_preview}
                </p>
                <p className="text-xs text-gray-400 mt-2">최근 갱신: {formatDate(item.updatedAt)}</p>
              </a>
            ))}
          </div>
        )}

        {/* 페이지네이션 */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-1">
            <p className="text-xs text-gray-500">전체 {pagination.total}건</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1 || loading}
                className="text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40"
              >
                이전
              </button>
              <span className="text-xs text-gray-600">{page} / {pagination.totalPages}</span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= pagination.totalPages || loading}
                className="text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 검색어가 있을 때 트렌드 태그 하단 표시 */}
      {query && trends.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">빈도 높은 용어</h2>
          <div className="flex flex-wrap gap-2">
            {trends.map((t) => (
              <a
                key={t.id}
                href={`/dictionary/${t.id}`}
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-colors hover:opacity-80 ${getCategoryBadgeClass(t.category)}`}
              >
                {t.name}
                <span className="ml-1 text-current opacity-60">{t.frequency}</span>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

**Step 2: Suspense 래퍼 추가 고려**

`useSearchParams()`를 사용하는 Client Component는 Next.js App Router에서 `<Suspense>`로 감싸야 합니다. `page.tsx` 전체를 Suspense로 처리하거나, 내부 컴포넌트로 분리합니다.

`page.tsx`를 다음 구조로 수정:
```typescript
import { Suspense } from 'react';
import DictionaryPageInner from './_components/DictionaryPageInner';
import { Spinner } from '@/components/ui/Spinner';

export default function DictionaryPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Spinner size="md" /></div>}>
      <DictionaryPageInner />
    </Suspense>
  );
}
```

내부 컴포넌트를 `_components/DictionaryPageInner.tsx`로 분리하거나, 단순하게 `page.tsx` 최상단에서 감쌉니다.

**Step 3: Commit**

```bash
git add domain-dictionary/src/app/(authenticated)/dictionary/
git commit -m "feat: 용어사전 뷰어 화면 구현 (검색, 카테고리 필터, 트렌드, 페이지네이션)"
```

---

## Task 7: 용어 상세 화면 (T7-5)

**Files:**
- Create: `domain-dictionary/src/app/(authenticated)/dictionary/[id]/page.tsx`

**Step 1: 화면 컴포넌트 생성**

```typescript
// domain-dictionary/src/app/(authenticated)/dictionary/[id]/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/lib/toast/toast-context';
import { getCategoryBadgeClass, getCategoryLabel } from '@/lib/utils/category';

interface Term {
  id: string;
  name: string;
  category: string | null;
  description: string;
  frequency: number;
  createdAt: string;
  updatedAt: string;
}

interface SourceFile {
  id: string;
  mailFileName: string;
  mailSubject: string | null;
  mailReceivedAt: string | null;
  createdAt: string;
}

function formatDate(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso)
    .toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
    .replace(/\. /g, '-').replace('.', '').trim();
}

export default function TermDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [term, setTerm] = useState<Term | null>(null);
  const [sources, setSources] = useState<SourceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    params.then(({ id }) => {
      fetch(`/api/dictionary/terms/${id}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            setTerm(json.data.term);
            setSources(json.data.sources);
          } else if (json.message?.includes('찾을 수 없습니다')) {
            setNotFound(true);
          } else {
            addToast('error', json.message ?? '데이터를 불러오지 못했습니다.');
          }
        })
        .catch(() => addToast('error', '서버 오류가 발생했습니다.'))
        .finally(() => setLoading(false));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4" />
          <div className="h-4 bg-gray-100 rounded w-full mb-2" />
          <div className="h-4 bg-gray-100 rounded w-5/6 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-4/6" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-24 mb-4" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded w-full mb-2" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !term) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-500 text-sm mb-4">요청하신 용어를 찾을 수 없습니다.</p>
        <button
          onClick={() => router.back()}
          className="text-sm text-indigo-600 hover:underline"
        >
          뒤로 가기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          aria-label="뒤로 가기"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          뒤로
        </button>
      </div>

      {/* 용어 기본 정보 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{term.name}</h1>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium shrink-0 ${getCategoryBadgeClass(term.category)}`}
          >
            {getCategoryLabel(term.category)}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500 mb-6">
          <span>빈도: <strong className="text-gray-700">{term.frequency}</strong></span>
          <span>최초 추출일: <strong className="text-gray-700">{formatDate(term.createdAt)}</strong></span>
          <span>최근 갱신일: <strong className="text-gray-700">{formatDate(term.updatedAt)}</strong></span>
        </div>

        <div className="prose prose-sm max-w-none">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">해설</h2>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{term.description}</p>
        </div>
      </section>

      {/* 출처 메일 목록 */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">출처 메일 ({sources.length}건)</h2>
        </div>
        {sources.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">출처 메일 정보가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {sources.map((src) => (
              <li key={src.id} className="px-6 py-3">
                <p className="text-sm text-gray-900">{src.mailSubject ?? '(제목 없음)'}</p>
                <p className="text-xs text-gray-400 mt-0.5">수신: {formatDate(src.mailReceivedAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add domain-dictionary/src/app/(authenticated)/dictionary/
git commit -m "feat: 용어 상세 화면 구현 (해설 전문 + 출처 메일 목록)"
```

---

## Task 8: 빌드 검증 및 린트

**Step 1: 린트 실행**

```bash
cd D:/Study/Hackathon/domain-dictionary
npm run lint
```

오류 발생 시 각 오류 메시지를 확인하고 수정합니다. 자주 발생하는 패턴:
- `@typescript-eslint/no-explicit-any` → 구체적인 타입으로 교체
- `react-hooks/exhaustive-deps` → 의존성 배열 정리 또는 주석 처리
- `@next/next/no-html-link-for-pages` → `<a>` 대신 `<Link>` 사용

**Step 2: useSearchParams Suspense 경고 확인**

Next.js App Router에서 `useSearchParams()`는 빌드 시 Suspense 래퍼가 없으면 경고가 발생합니다.
`dictionary/page.tsx`에서 내부 컴포넌트를 `<Suspense>`로 감쌌는지 확인합니다.

**Step 3: <a> 태그 Link 컴포넌트 교체**

`dictionary/page.tsx`의 트렌드 태그와 검색 결과 카드에서 `<a href="...">` 대신 Next.js `<Link href="...">` 사용:
```typescript
import Link from 'next/link';
// <a href={...}> → <Link href={...}>
```

**Step 4: 빌드 실행**

```bash
cd D:/Study/Hackathon/domain-dictionary
npm run build
```

빌드 성공 확인. 실패 시 오류 메시지를 분석하여 수정합니다.

**Step 5: Commit**

```bash
git add -A
git commit -m "fix: 빌드/린트 오류 수정 (Link 컴포넌트, Suspense 래퍼)"
```

---

## 완료 기준 (Definition of Done)

- ✅ 용어 검색 API (`GET /api/dictionary/search`)가 FTS5 전문 검색으로 결과를 반환함
- ✅ 카테고리 파라미터(`?category=emr`)로 필터링이 동작함
- ✅ 페이지네이션이 20건 단위로 동작함 (`?page=2`)
- ✅ 빈도 트렌드 API (`GET /api/dictionary/trending`)가 상위 10개를 반환함
- ✅ 용어 상세 API (`GET /api/dictionary/terms/:id`)가 용어 정보 + 출처 메일 목록을 반환함
- ✅ 존재하지 않는 id 요청 시 404 응답이 반환됨
- ✅ 용어사전 뷰어(`/dictionary`)에서 300ms 디바운스 검색이 동작함
- ✅ URL 파라미터(`?q=keyword&category=emr&page=2`)가 검색 상태와 동기화됨
- ✅ 카테고리 필터 버튼 클릭 시 결과가 재필터링됨
- ✅ 검색어 없을 때 빈도 트렌드 태그가 표시됨
- ✅ 트렌드 태그 클릭 시 용어 상세 화면으로 이동함
- ✅ 검색 결과가 없을 때 "검색 결과가 없습니다." 메시지가 표시됨
- ✅ 용어 상세 화면(`/dictionary/[id]`)에서 해설 전문과 출처 메일 목록이 표시됨
- ✅ 뒤로가기 버튼이 동작함
- ✅ 존재하지 않는 용어 접근 시 404 안내 메시지가 표시됨
- ✅ `npm run lint` 통과
- ✅ `npm run build` 통과

---

## 배포 전략

### 자동 검증 (sprint-close 시 실행)
- ✅ `npm run lint` — ESLint 코드 스타일 검증
- ✅ `npm run build` — 프로덕션 빌드 성공 여부

### 수동 검증 필요
- ⬜ `npm run dev` 실행 후 `/dictionary` 경로 접속하여 UI 확인
- ⬜ 실제 terms 데이터가 DB에 있는 환경에서 FTS5 검색 결과 확인
- ⬜ 트렌드 태그 클릭 → 상세 화면 이동 흐름 확인
- ⬜ 모바일(360px) 레이아웃 확인

---

## 예상 산출물

| 파일 | 설명 |
|------|------|
| `src/app/api/dictionary/search/route.ts` | 용어 검색 API (FTS5, 카테고리, 페이지네이션) |
| `src/app/api/dictionary/trending/route.ts` | 빈도 트렌드 API |
| `src/app/api/dictionary/terms/[id]/route.ts` | 용어 상세 API |
| `src/lib/utils/category.ts` | 카테고리 색상/레이블 유틸리티 |
| `src/app/(authenticated)/dictionary/page.tsx` | 용어사전 뷰어 화면 |
| `src/app/(authenticated)/dictionary/[id]/page.tsx` | 용어 상세 화면 |

---

## 의존성 및 리스크

| 리스크 | 가능성 | 완화 방안 |
|--------|--------|-----------|
| FTS5 raw SQL에서 Drizzle DB 인스턴스 접근 방식 | 중 | `db.$client` 확인 후 getRawSqlite 헬퍼로 추출 |
| FTS5 MATCH 쿼리 특수문자 에러 | 중 | 쿼리 문자열 이스케이프 처리 (`['"*^()]` 제거) |
| useSearchParams Suspense 경고 | 낮음 | page.tsx에서 Suspense 래퍼 적용 |
| terms 데이터 없을 때 UI 빈 상태 | 낮음 | 빈 상태 처리 이미 구현됨 |

---

## 기술 고려사항

- FTS5 MATCH 쿼리는 `*` 후방 매칭으로 부분 검색 지원 (`emr*` → "emr", "emrs" 등 매칭)
- 검색어 특수문자(따옴표, 괄호 등)는 반드시 제거 또는 이스케이프해야 SQLite 에러 방지
- `useSearchParams()`를 사용하는 컴포넌트는 Next.js App Router에서 반드시 `<Suspense>`로 래핑
- `<a>` 대신 `<Link>` 사용으로 Next.js 클라이언트 사이드 네비게이션 활용
- `params`가 Next.js 15에서 `Promise<{ id: string }>`로 변경됨 — `await params` 또는 `.then()` 필요

---

## Playwright MCP 검증 시나리오

> `npm run dev` 실행 후 terms 데이터가 있는 상태에서 검증

**용어사전 뷰어 검증:**
1. `browser_navigate` → `http://localhost:3000/dictionary` (로그인 상태)
2. `browser_snapshot` → 검색 입력 필드, 트렌드 용어 태그 표시 확인
3. `browser_type` → 검색 입력에 "EMR" 입력
4. `browser_wait_for` → 검색 결과 목록 표시 대기 (300ms 디바운스 후)
5. `browser_snapshot` → 검색 결과 카드 확인 (용어명, 카테고리 뱃지, 해설 미리보기)
6. `browser_click` → 카테고리 필터 "EMR" 클릭
7. `browser_snapshot` → 필터링된 결과 확인
8. `browser_click` → 첫 번째 검색 결과 카드 클릭
9. `browser_wait_for` → `/dictionary/[id]` 경로로 이동 대기
10. `browser_snapshot` → 용어 상세 화면 (용어명, 해설 전문, 출처 메일 목록)

**빈 검색 결과 검증:**
11. `browser_navigate` → `http://localhost:3000/dictionary`
12. `browser_type` → "존재하지않는용어12345" 입력
13. `browser_wait_for` → "검색 결과가 없습니다" 텍스트 대기
14. `browser_snapshot` → 빈 상태 메시지 확인
15. `browser_console_messages(level: "error")` → 콘솔 에러 없음 확인

**트렌드 용어 바로가기:**
16. `browser_navigate` → `http://localhost:3000/dictionary`
17. `browser_snapshot` → 트렌드 용어 태그 확인
18. `browser_click` → 첫 번째 트렌드 용어 태그 클릭
19. `browser_snapshot` → 용어 상세 화면 이동 확인

**URL 파라미터 동기화 검증:**
20. `browser_navigate` → `http://localhost:3000/dictionary?q=EMR&category=emr&page=1`
21. `browser_snapshot` → 검색어 입력 필드에 "EMR", 카테고리 "EMR" 선택 상태 확인
