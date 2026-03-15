# Sprint 9: 에러 처리 + 접근성 + FTS5 최적화

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Phase 5(안정화)의 첫 번째 스프린트로, 전역 에러 처리 강화 / 접근성(a11y) 개선 / FTS5 검색 하이라이팅 / 용어 사전 파일 동기화 API / 반응형 최종 점검을 통해 서비스 품질을 완성 수준으로 끌어올린다.

**Architecture:** Next.js App Router의 `error.tsx` / `not-found.tsx` 파일 컨벤션을 활용하여 에러 경계를 전역/인증 레이아웃 두 레벨로 설정한다. 접근성 개선은 기존 컴포넌트(GNB, Toast, Login Form)를 수정한다. FTS5 하이라이팅은 기존 `/api/dictionary/search` route에 `highlight` 필드를 추가하고, 클라이언트 dictionary/page.tsx에서 마커 문자열을 React 요소로 변환하여 볼드 처리한다. 파일 동기화 API는 admin 전용 POST endpoint로 추가한다.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, SQLite FTS5 (better-sqlite3), iron-session

---

## 개요

| 항목 | 내용 |
|------|------|
| 스프린트 번호 | Sprint 9 |
| Phase | Phase 5 (안정화) — 첫 번째 스프린트 |
| 기간 | 2주 |
| 브랜치 | `sprint9` |
| 상태 | ✅ 완료 (2026-03-15) |

## 스프린트 목표

Sprint 8까지 M4 마일스톤(전체 UI 완성 MVP)을 달성한 상태에서, Phase 5 안정화의 첫 스프린트로서 다음 목표를 달성한다:

1. **전역 에러 처리**: 404 / 런타임 에러에 대한 사용자 친화적 페이지 제공
2. **접근성(a11y) 개선**: GNB 네비게이션, 토스트, 로그인 폼에 ARIA 속성 보강
3. **FTS5 검색 하이라이팅**: 검색어 주변 텍스트 발췌 + 볼드 처리로 검색 UX 개선
4. **용어 파일 동기화 API**: DB-파일 간 누락된 `.md` 파일 재생성 admin 기능
5. **반응형 최종 점검**: 모바일 대응 누락된 대시보드 테이블 및 설정 화면 수정

## 현재 상태 파악

### 기존 구현 확인 사항

- `src/app/layout.tsx` — 루트 레이아웃 존재, `error.tsx` / `not-found.tsx` **미존재**
- `src/app/(authenticated)/layout.tsx` — 인증 레이아웃 존재, `error.tsx` **미존재**
- `src/components/layout/GNB.tsx` — 햄버거 버튼에 `aria-label` 있음, 네비게이션 링크에 `aria-label` / `aria-current` **없음**
- `src/components/ui/Toast.tsx` — `role="alert"` 이미 있음, `aria-live` **없음**
- `src/app/login/page.tsx` — label-input 연결(`htmlFor`/`id`), `aria-describedby`, `aria-invalid` 이미 구현됨 — 로그인 폼 접근성은 대부분 완료 상태
- `src/app/api/dictionary/search/route.ts` — FTS5 검색 구현됨, `highlight` 필드 **없음**
- `src/app/api/admin/sync-terms` — **미존재**
- `src/app/(authenticated)/dashboard/page.tsx` — 분석 이력 테이블에 `overflow-x-auto` **없음**

### 구현해야 할 사항

| 태스크 | 대상 파일 | 상태 |
|--------|-----------|------|
| T9-1-a: 전역 404 페이지 | `src/app/not-found.tsx` | 신규 생성 |
| T9-1-b: 전역 에러 페이지 | `src/app/error.tsx` | 신규 생성 |
| T9-1-c: 인증 레이아웃 에러 바운더리 | `src/app/(authenticated)/error.tsx` | 신규 생성 |
| T9-2-a: GNB 접근성 | `src/components/layout/GNB.tsx` | 수정 |
| T9-2-b: Toast aria-live | `src/components/ui/Toast.tsx` | 수정 |
| T9-3-a: 검색 API 하이라이트 필드 | `src/app/api/dictionary/search/route.ts` | 수정 |
| T9-3-b: 검색 결과 볼드 처리 | `src/app/(authenticated)/dictionary/page.tsx` | 수정 |
| T9-4: 용어 파일 동기화 API | `src/app/api/admin/sync-terms/route.ts` | 신규 생성 |
| T9-5-a: 대시보드 테이블 모바일 대응 | `src/app/(authenticated)/dashboard/page.tsx` | 수정 |
| T9-5-b: 설정 화면 모바일 점검 | `src/app/(authenticated)/settings/page.tsx` | 확인/수정 |

---

## 태스크 목록

### Task 1: 전역 에러 처리 강화 (T9-1)

**Files:**
- Create: `domain-dictionary/src/app/not-found.tsx`
- Create: `domain-dictionary/src/app/error.tsx`
- Create: `domain-dictionary/src/app/(authenticated)/error.tsx`

#### 1-a. `src/app/not-found.tsx` 생성

Next.js가 404 응답을 처리할 때 자동으로 렌더링하는 전역 Not Found 페이지다.
링크가 없는 정적 페이지이므로 Server Component로 작성한다.

**Step 1: 파일 생성**

```tsx
// src/app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-indigo-300 mb-4">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">페이지를 찾을 수 없습니다</h1>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          대시보드로 이동
        </Link>
      </div>
    </div>
  );
}
```

**Step 2: 동작 확인 방법**

`npm run dev` 실행 후 브라우저에서 `http://localhost:3000/nonexistent-page` 접속 → 404 페이지 렌더링 확인

**Step 3: Commit**

```bash
git add domain-dictionary/src/app/not-found.tsx
git commit -m "feat: 전역 404 not-found 페이지 추가"
```

---

#### 1-b. `src/app/error.tsx` 생성

Next.js의 전역 런타임 에러 바운더리다.
`'use client'` 필수 (Error Boundary는 Client Component만 가능).

**Step 1: 파일 생성**

```tsx
// src/app/error.tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // 에러 로깅 (스택 트레이스는 클라이언트에 노출하지 않음)
    console.error('[GlobalError]', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <p className="text-5xl font-bold text-red-300 mb-4">오류</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">문제가 발생했습니다</h1>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          일시적인 오류입니다. 잠시 후 다시 시도해 주세요.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            다시 시도
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
          >
            대시보드로 이동
          </Link>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add domain-dictionary/src/app/error.tsx
git commit -m "feat: 전역 런타임 에러 페이지(error.tsx) 추가"
```

---

#### 1-c. `src/app/(authenticated)/error.tsx` 생성

인증 레이아웃 세그먼트 안에서 발생하는 런타임 에러를 잡는 에러 바운더리다.
GNB가 없는 상태에서도 사용자가 복구할 수 있도록 대시보드 링크를 제공한다.

**Step 1: 파일 생성**

```tsx
// src/app/(authenticated)/error.tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AuthenticatedError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('[AuthenticatedError]', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <p className="text-5xl font-bold text-red-300 mb-4">오류</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">페이지 로딩 중 오류가 발생했습니다</h1>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          네트워크 상태를 확인하거나 잠시 후 다시 시도해 주세요.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            다시 시도
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
          >
            대시보드로 이동
          </Link>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: 빌드 확인**

```bash
cd domain-dictionary && npm run build
```

Expected: 에러 없이 빌드 완료

**Step 3: Commit**

```bash
git add domain-dictionary/src/app/\(authenticated\)/error.tsx
git commit -m "feat: 인증 레이아웃 에러 바운더리(error.tsx) 추가"
```

---

### Task 2: 접근성 개선 (T9-2)

**Files:**
- Modify: `domain-dictionary/src/components/layout/GNB.tsx`
- Modify: `domain-dictionary/src/components/ui/Toast.tsx`

#### 2-a. GNB 네비게이션 접근성 보강

현재 GNB의 `<nav>` 태그에 `aria-label`이 없고, 활성 링크에 `aria-current="page"`가 없다.

**Step 1: GNB.tsx 수정 — `<nav>` aria-label 추가**

`<nav className="bg-indigo-800 text-white shadow-md">` 를 아래와 같이 수정:

```tsx
<nav className="bg-indigo-800 text-white shadow-md" aria-label="주 메뉴">
```

**Step 2: 데스크탑 링크에 `aria-current` 추가**

`navLinkClass` 함수가 클래스만 반환하므로 링크 JSX에서 직접 `aria-current` 속성을 조건부로 부여한다.
기존 패턴:

```tsx
<Link href="/dashboard" className={navLinkClass('/dashboard')}>
  대시보드
</Link>
```

수정 후 패턴 (데스크탑 4개 링크 모두 동일하게):

```tsx
<Link
  href="/dashboard"
  className={navLinkClass('/dashboard')}
  aria-current={isActive('/dashboard') ? 'page' : undefined}
>
  대시보드
</Link>
```

수정 대상 링크 (데스크탑):
- `/dashboard` 링크
- `/dictionary` 링크
- `/settings` 링크 (admin 전용)
- `/admin/users` 링크 (admin 전용)

**Step 3: 모바일 링크에도 `aria-current` 추가**

모바일 드롭다운 메뉴의 4개 링크에도 동일하게 `aria-current={isActive(href) ? 'page' : undefined}` 추가.

**Step 4: 햄버거 버튼 aria-expanded 추가**

```tsx
<button
  className="md:hidden p-2 rounded-md text-indigo-100 hover:bg-indigo-700 focus:outline-none"
  onClick={() => setMenuOpen(!menuOpen)}
  aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
  aria-expanded={menuOpen}
  aria-controls="mobile-menu"
>
```

그리고 모바일 드롭다운 div에 `id="mobile-menu"` 추가:

```tsx
{menuOpen && (
  <div id="mobile-menu" className="md:hidden border-t border-indigo-700 px-4 pt-2 pb-4 space-y-1">
```

**Step 5: 빌드 확인**

```bash
cd domain-dictionary && npm run lint
```

Expected: 에러 없음

**Step 6: Commit**

```bash
git add domain-dictionary/src/components/layout/GNB.tsx
git commit -m "feat: GNB 접근성 개선 — aria-label, aria-current, aria-expanded 추가"
```

---

#### 2-b. Toast 컴포넌트 `aria-live` 추가

현재 `ToastContainer` div에 `aria-live`가 없다. 스크린 리더가 동적으로 추가되는 알림을 읽으려면 `aria-live="polite"` 가 컨테이너에 있어야 한다.

**Step 1: ToastContainer에 aria-live 추가**

`Toast.tsx`의 `ToastContainer` 함수 수정:

```tsx
export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="알림"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}
```

참고: `ToastItem`의 `role="alert"`는 이미 있으므로 유지한다.

**Step 2: Commit**

```bash
git add domain-dictionary/src/components/ui/Toast.tsx
git commit -m "feat: Toast 컨테이너에 aria-live 추가"
```

---

### Task 3: FTS5 검색 결과 하이라이팅 (T9-3)

**Files:**
- Modify: `domain-dictionary/src/app/api/dictionary/search/route.ts`
- Modify: `domain-dictionary/src/app/(authenticated)/dictionary/page.tsx`

#### 3-a. 검색 API에 `highlight` 필드 추가

FTS5의 `snippet()` 함수를 사용하여 검색어 주변 텍스트를 발췌한다.
`snippet(terms_fts, 1, '[[', ']]', '…', 20)` — 컬럼 1(description), 마커 `[[`/`]]`, 앞뒤 20 토큰.

마커로 `[[`/`]]`를 사용하는 이유: 클라이언트에서 단순 문자열 split으로 React 요소를 생성할 수 있어 XSS 위험 없이 안전하게 하이라이팅을 구현할 수 있다.

**Step 1: route.ts 수정 — FTS5 검색 쿼리에 snippet 추가**

기존 FTS5 쿼리의 SELECT 절을 수정한다. 카테고리 필터 없는 경우:

```sql
SELECT t.id, t.name, t.category, t.description, t.frequency, t.updated_at as updatedAt,
       snippet(terms_fts, 1, '[[', ']]', '…', 20) as highlight
FROM terms_fts fts
JOIN terms t ON fts.rowid = t.rowid
WHERE terms_fts MATCH ?
ORDER BY bm25(terms_fts), t.frequency DESC
LIMIT ? OFFSET ?
```

카테고리 필터 있는 경우도 동일하게 `snippet(...)` 추가.

**Step 2: rows 타입 및 items 매핑 수정**

```ts
let rows: {
  id: string;
  name: string;
  category: string | null;
  description: string;
  frequency: number;
  updatedAt: string;
  highlight?: string;
}[];
```

items 매핑에 highlight 포함:

```ts
const items = rows.map((r) => ({
  ...r,
  description: r.description.length > 200 ? r.description.slice(0, 200) + '…' : r.description,
  highlight: r.highlight ?? null,
}));
```

검색어 없는 일반 목록(`q` 비어있을 때)은 `highlight: null`로 처리한다.

**Step 3: Commit**

```bash
git add domain-dictionary/src/app/api/dictionary/search/route.ts
git commit -m "feat: 검색 API에 FTS5 snippet 기반 highlight 필드 추가"
```

---

#### 3-b. 검색 결과 화면에서 하이라이팅 렌더링

클라이언트에서 `[[`/`]]` 마커를 `<strong>` 태그로 변환하는 유틸리티 함수를 만들고, 검색 결과 카드에 적용한다.

**Step 1: TermItem 인터페이스에 highlight 필드 추가**

`dictionary/page.tsx`의 `TermItem` 인터페이스:

```ts
interface TermItem {
  id: string;
  name: string;
  category: string | null;
  description: string;
  highlight: string | null;
  frequency: number;
  updatedAt: string;
}
```

**Step 2: 하이라이트 렌더링 함수 추가**

컴포넌트 상단(함수 밖)에 추가:

```tsx
function renderHighlight(text: string): React.ReactNode[] {
  const parts = text.split(/(\[\[|\]\])/);
  let isBold = false;
  return parts
    .map((part, i) => {
      if (part === '[[') { isBold = true; return null; }
      if (part === ']]') { isBold = false; return null; }
      return isBold
        ? <strong key={i} className="font-semibold text-indigo-700">{part}</strong>
        : <span key={i}>{part}</span>;
    })
    .filter(Boolean) as React.ReactNode[];
}
```

**Step 3: 검색 결과 카드에 적용**

기존 설명 표시 부분:

```tsx
<p className="text-sm text-gray-600 leading-relaxed">{term.description}</p>
```

수정 후:

```tsx
<p className="text-sm text-gray-600 leading-relaxed">
  {term.highlight ? renderHighlight(term.highlight) : term.description}
</p>
```

**Step 4: 빌드 및 린트 확인**

```bash
cd domain-dictionary && npm run lint && npm run build
```

Expected: 에러 없이 완료

**Step 5: Commit**

```bash
git add domain-dictionary/src/app/\(authenticated\)/dictionary/page.tsx
git commit -m "feat: 검색 결과에 FTS5 하이라이팅 볼드 처리 추가"
```

---

### Task 4: 용어 사전 파일 동기화 API (T9-4)

**Files:**
- Modify: `domain-dictionary/src/lib/dictionary/dictionary-store.ts`
- Modify: `domain-dictionary/src/lib/fs/file-manager.ts` (exists 함수 없는 경우)
- Create: `domain-dictionary/src/app/api/admin/sync-terms/route.ts`

DB의 `terms` 테이블에 등록된 용어 중 `./data/terms/{name}.md` 파일이 없는 용어를 찾아 파일을 재생성하는 admin 전용 API다.

`dictionary-store.ts`의 `buildGlossaryMarkdown` 함수와 `toSafeFileName` 함수가 이미 구현되어 있으나 모듈 내 비공개 함수다. 중복을 피하기 위해 두 함수를 export로 변경하고 route.ts에서 import하는 방식을 사용한다.

**Step 1: dictionary-store.ts — 두 함수를 export로 변경**

`domain-dictionary/src/lib/dictionary/dictionary-store.ts` 수정:

```ts
// 변경 전
function toSafeFileName(termName: string): string { ... }
function buildGlossaryMarkdown(...): string { ... }

// 변경 후
export function toSafeFileName(termName: string): string { ... }
export function buildGlossaryMarkdown(...): string { ... }
```

**Step 2: file-manager.ts — exists 함수 확인 및 추가**

`src/lib/fs/file-manager.ts` 파일에 `exists` 함수가 없으면 아래를 추가:

```ts
export function exists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
```

(`fs`는 이미 import되어 있으므로 추가 import 불필요)

**Step 3: sync-terms route.ts 생성**

```ts
// src/app/api/admin/sync-terms/route.ts
import path from 'path';
import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { terms } from '@/db/schema';
import { sessionOptions, type SessionData } from '@/lib/auth/session';
import { exists, writeFile } from '@/lib/fs/file-manager';
import { buildGlossaryMarkdown, toSafeFileName } from '@/lib/dictionary/dictionary-store';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const GLOSSARY_DIR = process.env.GLOSSARY_STORAGE_PATH ?? './data/terms';

// POST /api/admin/sync-terms — DB terms에 있지만 파일이 없는 용어의 파일 재생성 (admin only)
export async function POST() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId) {
    return NextResponse.json({ success: false, message: '로그인이 필요합니다.' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ success: false, message: '관리자 권한이 필요합니다.' }, { status: 403 });
  }

  try {
    const allTerms = db.select().from(terms).all();
    const results = { created: 0, skipped: 0, errors: 0 };

    for (const term of allTerms) {
      const safeFileName = toSafeFileName(term.name);
      const filePath = path.join(GLOSSARY_DIR, `${safeFileName}.md`);

      try {
        if (exists(filePath)) {
          results.skipped++;
          continue;
        }

        const mdContent = buildGlossaryMarkdown({
          name: term.name,
          category: term.category ?? 'general',
          description: term.description,
          frequency: term.frequency,
          updatedAt: term.updatedAt,
        });

        writeFile(filePath, mdContent);
        results.created++;
        logger.info('[sync-terms] 파일 재생성', { name: term.name, filePath });
      } catch (err) {
        results.errors++;
        logger.error('[sync-terms] 파일 생성 실패', { name: term.name, error: String(err) });
      }
    }

    logger.info('[sync-terms] 동기화 완료', results);
    return NextResponse.json({
      success: true,
      data: results,
      message: `동기화 완료: 생성 ${results.created}건, 건너뜀 ${results.skipped}건, 오류 ${results.errors}건`,
    });
  } catch (err) {
    logger.error('[sync-terms] 오류', { error: String(err) });
    return NextResponse.json({ success: false, message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
```

**Step 4: 빌드 확인**

```bash
cd domain-dictionary && npm run build
```

Expected: 에러 없이 완료

**Step 5: Commit**

```bash
git add domain-dictionary/src/app/api/admin/sync-terms/route.ts
git add domain-dictionary/src/lib/dictionary/dictionary-store.ts
git add domain-dictionary/src/lib/fs/file-manager.ts
git commit -m "feat: 용어 사전 파일 동기화 API (POST /api/admin/sync-terms) 추가"
```

---

### Task 5: 반응형 최종 점검 (T9-5)

**Files:**
- Modify: `domain-dictionary/src/app/(authenticated)/dashboard/page.tsx`
- Review: `domain-dictionary/src/app/(authenticated)/settings/page.tsx`

#### 5-a. 대시보드 분석 이력 테이블 모바일 대응

현재 분석 이력 테이블이 `<section className="bg-white rounded-xl border border-gray-200 overflow-hidden">` 안에 있으며, 테이블 자체에 `overflow-x-auto` 컨테이너가 없다. 모바일 360px에서 테이블 열이 잘린다.

**Step 1: 테이블 래퍼에 overflow-x-auto 추가**

`dashboard/page.tsx`에서 테이블 부분:

```tsx
{/* 기존 */}
<table className="w-full text-sm">
  ...
</table>

{/* 수정: 테이블을 div로 감싸기 */}
<div className="overflow-x-auto">
  <table className="w-full text-sm">
    {/* 기존 테이블 내용 그대로 유지 */}
  </table>
</div>
```

**Step 2: Commit**

```bash
git add domain-dictionary/src/app/\(authenticated\)/dashboard/page.tsx
git commit -m "fix: 대시보드 분석 이력 테이블 모바일 overflow-x-auto 추가"
```

---

#### 5-b. 설정 화면 모바일 레이아웃 확인

`settings/page.tsx`를 검토하여 모바일에서 레이아웃이 깨지는 부분이 있으면 수정한다.

**확인 항목:**
- 폼 섹션의 그리드 레이아웃: `grid-cols-2` 등이 있으면 `sm:grid-cols-2 grid-cols-1`로 변경
- 입력 필드 너비: 모바일에서 `w-full` 적용 여부
- 버튼 영역: 모바일에서 버튼이 넘치지 않는지 확인

**Step 1: settings/page.tsx 전체 검토**

현재 `settings/page.tsx`의 레이아웃 클래스를 확인하고, 모바일에서 문제가 되는 부분을 수정한다.

주로 점검할 패턴:
- `grid grid-cols-2` → `grid grid-cols-1 sm:grid-cols-2`
- `flex gap-X` 버튼 영역 → 모바일에서 `flex-col sm:flex-row` 고려

**Step 2: Commit (수정이 있는 경우)**

```bash
git add domain-dictionary/src/app/\(authenticated\)/settings/page.tsx
git commit -m "fix: 설정 화면 모바일 레이아웃 개선"
```

---

## 완료 기준 (Definition of Done)

- ✅ `http://localhost:3000/not-found-page` 접속 시 404 페이지 렌더링
- ✅ `http://localhost:3000/work/nonexistent-id` 접속 시 사용자 친화적 404 메시지
- ✅ GNB 네비게이션 링크에 `aria-current="page"` 적용됨 (활성 링크)
- ✅ 토스트 컨테이너에 `aria-live="polite"` 적용됨
- ✅ 검색어 입력 시 검색 결과 카드에 검색어 주변 텍스트가 볼드 처리됨
- ✅ `POST /api/admin/sync-terms` 호출 시 누락된 용어 파일이 재생성됨
- ✅ 대시보드 분석 이력 테이블이 360px 모바일에서 가로 스크롤 가능함
- ✅ `npm run build` 에러 없이 완료됨
- ✅ `npm run lint` 에러 없음

---

## 검증 결과

- [Playwright 테스트 보고서](sprint9/test-report.md)
- [스크린샷 모음](sprint9/)

---

## 배포 전략 (CI/CD)

이 스프린트는 UI 개선 및 API 추가 작업으로, 별도의 DB 마이그레이션이 없다.

| 항목 | 분류 | 설명 |
|------|------|------|
| `npm run lint` | ✅ 자동 | 코드 스타일 검증 |
| `npm run build` | ✅ 자동 | 빌드 성공 여부 확인 |
| 앱 재시작 | ⬜ 수동 | `npm run dev` 재실행 후 변경사항 확인 |
| Playwright 접근성 검증 | ⬜ 수동 | sprint-close 단계에서 수행 |

---

## 기술 고려사항

### T9-1: 에러 처리
- `app/error.tsx`는 루트 레이아웃의 자식만 커버한다. 루트 레이아웃 자체의 에러는 `app/global-error.tsx`로 처리하지만, 이 경우는 발생 가능성이 낮으므로 Sprint 9에서는 제외한다.
- `error.tsx`는 `'use client'` 필수 — Server Component로 작성하면 Next.js 빌드 에러 발생.

### T9-3: FTS5 하이라이팅
- `snippet()` 함수의 컬럼 인덱스는 0-based: `name`=0, `description`=1.
- 검색어 없는 경우(전체 목록)에는 `snippet()`을 호출하지 않으므로 `highlight` 필드가 `null`이다 — 클라이언트에서 null 체크 필수.
- `[[`/`]]` 마커 방식은 React 요소 직접 생성으로 XSS 위험 없이 하이라이팅을 구현하기 위한 선택이다.

### T9-4: 파일 동기화 API
- `file-manager.ts`에 `exists()` 함수가 없을 경우 추가 필요 — 먼저 파일을 확인한 후 진행한다.
- `dictionary-store.ts`의 `buildGlossaryMarkdown`과 `toSafeFileName`을 export로 변경할 때, 기존 내부 호출 코드(`saveTerm` 함수 내)도 동일하게 동작하므로 사이드 이펙트 없음.

### T9-2: 접근성
- 로그인 폼(`login/page.tsx`)은 이미 `aria-describedby`, `aria-invalid`, label-input 연결이 구현되어 있으므로 수정 불필요.
- GNB의 `aria-current`는 React의 조건부 속성으로 `undefined` 반환 시 DOM에 attribute가 렌더링되지 않는다.

---

## 구현 권장 순서

```
T9-1 (에러 페이지 3개) → T9-2a (GNB 접근성) → T9-2b (Toast aria-live)
→ T9-4 (파일 동기화 API — dictionary-store export 수정 포함)
→ T9-3a (검색 API highlight 필드) → T9-3b (검색 화면 하이라이팅)
→ T9-5a (대시보드 테이블 overflow) → T9-5b (설정 화면 점검)
→ npm run build + npm run lint 최종 확인
```

에러 처리를 먼저 구현하는 이유: 이후 작업 중 발생할 수 있는 런타임 에러를 에러 바운더리가 잡아주어 개발 흐름이 안정적이다.

---

## 예상 산출물

| 파일 | 설명 |
|------|------|
| `src/app/not-found.tsx` | 전역 404 페이지 (신규) |
| `src/app/error.tsx` | 전역 런타임 에러 페이지 (신규) |
| `src/app/(authenticated)/error.tsx` | 인증 영역 에러 바운더리 (신규) |
| `src/components/layout/GNB.tsx` | aria-label, aria-current, aria-expanded 추가 (수정) |
| `src/components/ui/Toast.tsx` | aria-live 추가 (수정) |
| `src/app/api/dictionary/search/route.ts` | highlight(snippet) 필드 추가 (수정) |
| `src/app/(authenticated)/dictionary/page.tsx` | 하이라이트 볼드 렌더링 (수정) |
| `src/app/api/admin/sync-terms/route.ts` | 파일 동기화 API (신규) |
| `src/lib/dictionary/dictionary-store.ts` | 함수 export 공개 (수정) |
| `src/lib/fs/file-manager.ts` | exists() 함수 추가 (수정, 없는 경우) |
| `src/app/(authenticated)/dashboard/page.tsx` | 테이블 overflow-x-auto 추가 (수정) |

---

## Playwright MCP 검증 시나리오

`npm run dev` 실행 후 아래 순서로 검증한다.

**에러 처리 검증:**
1. `browser_navigate` → `http://localhost:3000/nonexistent-page`
2. `browser_snapshot` → 404 페이지("페이지를 찾을 수 없습니다") 및 "대시보드로 이동" 링크 확인
3. `browser_navigate` → `http://localhost:3000/work/nonexistent-id`
4. `browser_snapshot` → 404 처리 확인

**접근성 검증:**
5. `browser_navigate` → `http://localhost:3000/dashboard` (로그인 상태)
6. `browser_snapshot` → GNB 활성 링크에 `aria-current="page"` 속성 확인
7. `browser_press_key` → Tab 키로 GNB 링크 순서대로 포커스 이동 확인

**FTS5 하이라이팅 검증:**
8. `browser_navigate` → `http://localhost:3000/dictionary`
9. `browser_type` → 검색어 입력 (DB에 존재하는 용어)
10. `browser_snapshot` → 검색 결과 카드에서 검색어 부분 볼드(`<strong>`) 처리 확인

**반응형 검증:**
11. `browser_resize` → 360px 너비
12. `browser_navigate` → `http://localhost:3000/dashboard`
13. `browser_snapshot` → 분석 이력 테이블 가로 스크롤 가능 여부 확인
14. `browser_resize` → 768px 너비
15. `browser_snapshot` → 태블릿 레이아웃 확인
16. `browser_console_messages(level: "error")` → 콘솔 에러 없음 확인
