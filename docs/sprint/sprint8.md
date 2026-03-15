# Sprint 8: 업무지원 상세 + 대시보드 연동 완성

## 개요

| 항목 | 내용 |
|------|------|
| 스프린트 번호 | Sprint 8 |
| Phase | Phase 4 (프론트엔드 완성) — 마지막 스프린트 |
| 기간 | 2주 |
| 브랜치 | `sprint8` |
| 상태 | 계획 |

## 스프린트 목표

Phase 4의 마지막 스프린트로, 업무지원 상세 화면(WORK-001)을 신규 구현하고, 대시보드에서 업무지원 상세로 이어지는 네비게이션을 완성한다. 날짜/시간 표시의 공통 유틸리티 적용을 통해 전체 화면의 표시 일관성을 확보하여 M4 마일스톤(전체 UI 완성 MVP)을 달성한다.

## 현재 상태 파악

### 기존 구현 확인 사항

- `GET /api/analysis/[id]/route.ts` — ANAL-003 API가 이미 구현되어 있음 (Sprint 7 이전)
  - `analysisQueue` 조회 + `termSourceFiles` join으로 `extractedTerms` 목록 반환
- `src/lib/utils/date.ts` — `formatDate` 공통 함수가 이미 존재함
  - 단, `dashboard/page.tsx`와 `dictionary/[id]/page.tsx`는 아직 인라인 `formatDate`를 사용 중
- `admin/users/page.tsx` — `formatDate` 미사용 (날짜 표시 없음) → T8-3 영향 없음
- GNB `isActive` 로직 — `/dashboard` 외 경로에는 `pathname.startsWith(href)` 적용
  - `/work/[id]` 경로는 `/work`로 시작하므로 GNB에 "업무지원" 메뉴가 없어도 별도 처리 불필요

### 구현해야 할 사항

| 항목 | 파일 | 상태 |
|------|------|------|
| 업무지원 상세 화면 | `src/app/(authenticated)/work/[id]/page.tsx` | 신규 생성 |
| 대시보드 → 업무지원 연동 링크 | `src/app/(authenticated)/dashboard/page.tsx` | 수정 |
| formatDate 공통 함수 교체 | `dashboard/page.tsx`, `dictionary/[id]/page.tsx` | 수정 |

---

## 태스크 목록

### T8-1: 업무지원 상세 화면 구현 (WORK-001)

**복잡도:** 중
**예상 소요:** 3~4시간

#### 관련 파일

- 생성: `src/app/(authenticated)/work/[id]/page.tsx`
- 참조 (읽기 전용):
  - `src/app/api/analysis/[id]/route.ts` — ANAL-003 응답 구조 확인
  - `src/lib/utils/category.ts` — 카테고리 색상/레이블
  - `src/lib/utils/date.ts` — formatDate
  - `src/app/(authenticated)/dictionary/[id]/page.tsx` — 유사한 상세 페이지 패턴 참조

#### API 응답 구조 (ANAL-003)

`GET /api/analysis/[id]` 응답:
```json
{
  "success": true,
  "data": {
    "item": {
      "id": "uuid",
      "fileName": "1710489000000_a1b2c3d4.txt",
      "mailSubject": "[긴급] EMR 시스템 업데이트 안내",
      "mailReceivedAt": "2026-03-15T08:30:00Z",
      "status": "completed",
      "summary": "EMR 시스템 v3.2 업데이트...",
      "actionItems": "[\"작업1\", \"작업2\"]",
      "analyzedAt": "2026-03-15T10:01:30Z",
      "retryCount": 0,
      "errorMessage": null,
      "createdAt": "2026-03-15T10:00:00Z"
    },
    "extractedTerms": [
      { "id": "term-uuid", "name": "EMR", "category": "emr" }
    ]
  }
}
```

#### 구현 상세

**Step 1: 파일 생성 및 기본 구조 작성**

`src/app/(authenticated)/work/[id]/page.tsx` 생성:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/date';
import { getCategoryColor, getCategoryLabel } from '@/lib/utils/category';

interface AnalysisItem {
  id: string;
  fileName: string;
  mailSubject: string | null;
  mailReceivedAt: string | null;
  status: string;
  summary: string | null;
  actionItems: string | null;
  analyzedAt: string | null;
  retryCount: number;
  errorMessage: string | null;
  createdAt: string;
}

interface ExtractedTerm {
  id: string;
  name: string;
  category: string | null;
}
```

**Step 2: 상태 및 데이터 페치 구현**

```typescript
const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  completed: { label: '완료', cls: 'bg-green-100 text-green-700' },
  failed: { label: '실패', cls: 'bg-red-100 text-red-600' },
  processing: { label: '처리 중', cls: 'bg-blue-100 text-blue-600' },
  pending: { label: '대기 중', cls: 'bg-yellow-100 text-yellow-600' },
};

export default function WorkDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<AnalysisItem | null>(null);
  const [terms, setTerms] = useState<ExtractedTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/analysis/${params.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setItem(json.data.item);
          setTerms(json.data.extractedTerms);
        } else if (json.message?.includes('찾을 수 없')) {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

**Step 3: 로딩/404/에러 상태 렌더링**

```typescript
  if (loading) {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="h-6 bg-gray-200 rounded animate-pulse w-24" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <div className="h-5 bg-gray-200 rounded animate-pulse w-48" />
            {[...Array(3)].map((_, j) => (
              <div key={j} className="h-4 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500 mb-4">요청하신 분석 결과를 찾을 수 없습니다.</p>
        <Link href="/dashboard" className="text-indigo-600 hover:underline">
          대시보드로 돌아가기
        </Link>
      </div>
    );
  }
```

**Step 4: 메인 렌더링 — 메일 정보 + 상태 영역**

```typescript
  const statusInfo = STATUS_BADGE[item.status] ?? { label: item.status, cls: 'bg-gray-100 text-gray-600' };

  // actionItems JSON 파싱 (TEXT 컬럼에 JSON 배열 저장)
  let actionList: string[] = [];
  if (item.actionItems) {
    try { actionList = JSON.parse(item.actionItems); } catch { /* 파싱 실패 시 빈 배열 */ }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* 뒤로가기 */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        ← 뒤로가기
      </button>

      {/* 헤더 제목 */}
      <h1 className="text-2xl font-bold text-gray-900">업무지원 상세</h1>

      {/* 메일 정보 카드 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-gray-900">{item.mailSubject ?? '(제목 없음)'}</p>
            <p className="text-xs text-gray-500 mt-1">
              {formatDate(item.mailReceivedAt)} 수신
              {item.analyzedAt && ` · ${formatDate(item.analyzedAt)} 분석 완료`}
            </p>
          </div>
          <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.cls}`}>
            {statusInfo.label}
          </span>
        </div>
      </section>
```

**Step 5: 상태별 컨텐츠 영역 렌더링**

```typescript
      {/* completed: 요약 + 후속 작업 + 추출 용어 */}
      {item.status === 'completed' && (
        <>
          {/* 요약 */}
          {item.summary && (
            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-3">핵심 요약</h2>
              <p className="text-gray-700 leading-relaxed">{item.summary}</p>
            </section>
          )}

          {/* 후속 작업 */}
          {actionList.length > 0 && (
            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-3">후속 작업 제안</h2>
              <ol className="space-y-2">
                {actionList.slice(0, 5).map((task, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-medium flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    {task}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* 추출 용어 */}
          {terms.length > 0 && (
            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-3">
                추출된 용어 <span className="text-gray-400 text-sm font-normal">({terms.length}개)</span>
              </h2>
              <div className="flex flex-wrap gap-2 mb-3">
                {terms.map((term) => (
                  <Link
                    key={term.id}
                    href={`/dictionary/${term.id}`}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium hover:opacity-80 transition-opacity ${getCategoryColor(term.category)}`}
                  >
                    {term.name}
                    <span className="ml-1 text-xs opacity-70">({getCategoryLabel(term.category)})</span>
                  </Link>
                ))}
              </div>
              {/* 카테고리 범례 */}
              <div className="flex flex-wrap gap-3 text-xs text-gray-500 border-t border-gray-100 pt-3">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />EMR</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />비즈니스</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />약어</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />일반</span>
              </div>
            </section>
          )}
        </>
      )}

      {/* processing */}
      {item.status === 'processing' && (
        <section className="bg-white rounded-xl border border-gray-200 p-6 text-center py-12">
          <p className="text-gray-600">분석이 진행 중입니다. 잠시 후 다시 확인해주세요.</p>
        </section>
      )}

      {/* pending */}
      {item.status === 'pending' && (
        <section className="bg-white rounded-xl border border-gray-200 p-6 text-center py-12">
          <p className="text-gray-600">분석 대기 중입니다.</p>
        </section>
      )}

      {/* failed */}
      {item.status === 'failed' && (
        <section className="bg-white rounded-xl border border-red-200 p-6">
          <h2 className="text-base font-semibold text-red-700 mb-2">분석에 실패했습니다.</h2>
          {item.errorMessage && (
            <p className="text-sm text-red-600 mb-2">{item.errorMessage}</p>
          )}
          <p className="text-xs text-gray-500">재시도 {item.retryCount}/3회</p>
        </section>
      )}
    </div>
  );
}
```

#### 완료 기준

- ⬜ `/work/[id]` 경로에서 메일 제목, 수신일, 분석 완료일, 상태 뱃지 표시
- ⬜ `status=completed`일 때 요약, 후속 작업, 추출 용어 표시
- ⬜ 추출 용어 태그 클릭 시 `/dictionary/{termId}`로 이동
- ⬜ `status=failed`일 때 오류 메시지 + 재시도 횟수 표시
- ⬜ `status=processing/pending`일 때 안내 메시지 표시
- ⬜ 존재하지 않는 ID 접근 시 404 상태 표시
- ⬜ 스켈레톤 로딩 UI 동작
- ⬜ 뒤로가기 버튼 동작

---

### T8-2: 대시보드 → 업무지원 상세 연동

**복잡도:** 소
**예상 소요:** 1시간

#### 관련 파일

- 수정: `src/app/(authenticated)/dashboard/page.tsx`

#### 변경 내용

**최신 분석 결과 영역에 "상세 보기" 링크 추가**

현재 코드 (dashboard/page.tsx, 224번째 줄 근처 최신 분석 결과 렌더링 부분):
```typescript
// 기존: 상세 보기 링크 없음
<p className="text-xs text-gray-500">추출 용어 {latest.extractedTermCount ?? 0}개</p>
```

변경 후:
```typescript
<div className="flex items-center justify-between">
  <p className="text-xs text-gray-500">추출 용어 {latest.extractedTermCount ?? 0}개</p>
  <Link
    href={`/work/${latest.id}`}
    className="text-xs text-indigo-600 hover:underline font-medium"
  >
    상세 보기 →
  </Link>
</div>
```

**분석 이력 테이블 각 행에 "보기" 링크 추가**

현재 코드 (테이블 행 렌더링 부분):
```typescript
// 기존: 행 전체가 단순 텍스트
<tr key={item.id} className="hover:bg-gray-50">
  <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{item.mailSubject ?? '(제목 없음)'}</td>
  ...
  <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">{item.extractedTermCount ?? '-'}</td>
</tr>
```

변경 후 (Link import 추가 및 마지막 td에 링크 추가):
```typescript
import Link from 'next/link';

// 행:
<tr key={item.id} className="hover:bg-gray-50">
  <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{item.mailSubject ?? '(제목 없음)'}</td>
  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell whitespace-nowrap">{formatDate(item.mailReceivedAt)}</td>
  <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
  <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">{item.extractedTermCount ?? '-'}</td>
  <td className="px-4 py-3 text-right">
    <Link href={`/work/${item.id}`} className="text-xs text-indigo-600 hover:underline">
      보기
    </Link>
  </td>
</tr>
```

테이블 헤더에도 열 추가:
```typescript
<th className="text-right px-4 py-3 font-medium text-gray-600"></th>
```

#### 완료 기준

- ⬜ 최신 분석 결과 카드에 "상세 보기 →" 링크가 표시되고 `/work/{id}`로 이동
- ⬜ 분석 이력 테이블 각 행에 "보기" 링크가 표시되고 `/work/{id}`로 이동

---

### T8-3: 날짜/시간 표시 공통 유틸리티 적용

**복잡도:** 소
**예상 소요:** 30분

#### 배경

`src/lib/utils/date.ts`의 `formatDate` 공통 함수가 이미 존재하나, 다음 파일들은 아직 인라인 함수를 사용 중:
- `src/app/(authenticated)/dashboard/page.tsx` — 57~63번째 줄 인라인 `formatDate`
- `src/app/(authenticated)/dictionary/[id]/page.tsx` — 25~31번째 줄 인라인 `formatDate`

#### 변경 내용

**dashboard/page.tsx:**

```typescript
// 제거: 인라인 formatDate 함수 (57~63번째 줄)
// function formatDate(iso: string | null) { ... }

// 추가 (import 상단에):
import { formatDate } from '@/lib/utils/date';
```

**dictionary/[id]/page.tsx:**

```typescript
// 제거: 인라인 formatDate 함수 (25~31번째 줄)
// function formatDate(iso: string | null) { ... }

// 추가 (기존 import에 합침):
import { getCategoryColor, getCategoryLabel } from '@/lib/utils/category';
// 위 줄 아래에 추가:
import { formatDate } from '@/lib/utils/date';
```

#### 완료 기준

- ⬜ `dashboard/page.tsx`에서 인라인 `formatDate` 제거, `@/lib/utils/date`에서 import
- ⬜ `dictionary/[id]/page.tsx`에서 인라인 `formatDate` 제거, `@/lib/utils/date`에서 import
- ⬜ 두 파일 모두 날짜 표시 동작이 변경 전후 동일함

---

### T8-4: 전체 화면 네비게이션 검증

**복잡도:** 소
**예상 소요:** 30분

#### 검증 항목

**GNB 활성 경로 하이라이트 확인:**

현재 GNB `isActive` 로직:
```typescript
const isActive = (href: string) =>
  pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
```

- `/dashboard` 경로: exact match만 적용 — `/work/[id]`에서 대시보드 하이라이트 없음 (정상)
- `/dictionary/[id]` 경로: `/dictionary`로 시작하므로 "용어사전" 메뉴 하이라이트 (정상)
- `/work/[id]` 경로: GNB에 "업무지원" 메뉴가 없으므로 별도 처리 불필요 (정상)

**`/work/[id]` 경로가 `(authenticated)` 레이아웃 안에 있는지 확인:**

- `src/app/(authenticated)/work/[id]/page.tsx` 생성 위치 확인
- `(authenticated)/layout.tsx`의 세션 인증 미들웨어가 자동 적용됨
- Next.js App Router에서 `(authenticated)` 그룹 내 모든 페이지에 레이아웃이 적용됨 → 별도 수정 불필요

**검증 체크리스트:**
- ⬜ `/work/[id]` 페이지 접근 시 GNB가 표시됨
- ⬜ 비인증 상태에서 `/work/[id]` 접근 시 `/login`으로 리다이렉트됨
- ⬜ `/dictionary/[id]` 접근 시 GNB에서 "용어사전" 메뉴가 활성화됨
- ⬜ `/work/[id]` 접근 시 GNB에서 어떤 메뉴도 하이라이트되지 않음 (정상)

---

## 구현 순서

```
T8-3 (날짜 유틸 적용)
  → T8-1 (업무지원 상세 화면 신규 구현)
  → T8-2 (대시보드 연동 링크 추가)
  → T8-4 (전체 네비게이션 검증)
```

**T8-3을 먼저 진행하는 이유:** T8-1에서 `formatDate`를 공통 함수로 처음부터 사용하기 위함. T8-2의 dashboard 수정에서도 인라인 formatDate 제거와 연동 링크 추가를 동시에 처리 가능.

---

## 의존성 및 전제 조건

| 항목 | 상태 | 비고 |
|------|------|------|
| `GET /api/analysis/[id]` (ANAL-003) | ✅ 구현 완료 | `src/app/api/analysis/[id]/route.ts` |
| `src/lib/utils/date.ts` (formatDate) | ✅ 구현 완료 | Sprint 7에서 생성 |
| `src/lib/utils/category.ts` | ✅ 구현 완료 | getCategoryColor, getCategoryLabel |
| `(authenticated)` 레이아웃 | ✅ 구현 완료 | 세션 인증 자동 적용 |
| GNB 컴포넌트 | ✅ 구현 완료 | 별도 수정 불필요 |

---

## 리스크 및 대응 방안

| 리스크 | 가능성 | 대응 |
|--------|--------|------|
| `actionItems` JSON 파싱 실패 | 중 | try/catch로 빈 배열 폴백 처리 (ROADMAP 기술 고려사항 명시) |
| `GET /api/analysis/[id]` 응답에 `mailSubject`가 null | 낮음 | `'(제목 없음)'` 폴백 표시 |
| `analyzedAt`이 null인 상태에서 날짜 표시 | 낮음 | `formatDate(null)` → '-' 반환으로 처리 |

---

## 완료 기준 (Definition of Done)

- ✅ 대시보드에서 분석 결과 클릭 시 `/work/{id}` 화면으로 이동함
- ✅ 업무지원 상세에서 요약, 후속 작업(최대 5개), 추출 용어가 정상 표시됨
- ✅ 추출 용어 태그 클릭 시 `/dictionary/{termId}` 용어 상세 화면으로 이동함
- ✅ `status=failed`일 때 오류 메시지 + 재시도 횟수가 표시됨
- ✅ 분석 이력 테이블에서 각 행의 "보기" 링크로 이동 가능함
- ✅ 모든 날짜/시간이 `formatDate` 공통 함수를 통해 "YYYY-MM-DD HH:mm" 형식으로 표시됨
- ✅ `/work/[id]` 경로가 `(authenticated)` 레이아웃 안에서 인증 보호가 적용됨
- ✅ `npm run build` 에러 없이 완료됨
- ✅ `npm run lint` 에러 없음

---

## 배포 전략

### 자동 검증 (sprint-close 시점에 실행)

- ✅ `npm run build` — 빌드 성공 여부 확인
- ✅ `npm run lint` — 코드 스타일 검증

### 수동 검증 필요 항목

다음 항목은 개발자가 `npm run dev` 실행 후 직접 확인해야 합니다.

**deploy.md 참고**

---

## Playwright MCP 검증 시나리오

> `npm run dev` 실행 후 아래 순서로 검증 (분석 결과 데이터가 있는 상태 필요)

**업무지원 상세 진입 흐름:**
1. `browser_navigate` → `http://localhost:3000/dashboard` (로그인 상태, 분석 결과 있는 상태)
2. `browser_snapshot` → 최신 분석 결과 영역에 "상세 보기 →" 링크 확인
3. `browser_click` → "상세 보기 →" 링크 클릭
4. `browser_wait_for` → `/work/` 경로 이동 대기
5. `browser_snapshot` → 메일 제목, 수신일, 상태 뱃지 표시 확인
6. `browser_snapshot` → 요약 영역, 후속 작업 영역, 추출 용어 태그 표시 확인

**용어 태그 → 용어 상세 연동:**
7. `browser_click` → 추출 용어 태그 클릭
8. `browser_wait_for` → `/dictionary/` 경로 이동 대기
9. `browser_snapshot` → 용어 상세 화면 확인

**뒤로가기:**
10. `browser_click` → 뒤로가기 버튼 클릭
11. `browser_snapshot` → 업무지원 상세 화면 복귀 확인

**분석 이력 목록 연동:**
12. `browser_navigate` → `http://localhost:3000/dashboard`
13. `browser_snapshot` → 분석 이력 테이블 "보기" 링크 열 확인
14. `browser_click` → 이력 목록 항목 "보기" 링크 클릭
15. `browser_snapshot` → 업무지원 상세 화면 이동 확인

**GNB 네비게이션 흐름:**
16. `browser_navigate` → `http://localhost:3000/dashboard`
17. `browser_click` → GNB "용어사전" 클릭
18. `browser_snapshot` → `/dictionary` 이동 + "용어사전" 메뉴 하이라이트 확인
19. `browser_click` → GNB "대시보드" 클릭
20. `browser_snapshot` → `/dashboard` 이동 + "대시보드" 메뉴 하이라이트 확인
21. `browser_console_messages(level: "error")` → 콘솔 에러 없음 확인

**비인증 접근 검증:**
22. 로그아웃 후 `browser_navigate` → `http://localhost:3000/work/any-id`
23. `browser_snapshot` → `/login`으로 리다이렉트 확인

---

## 예상 산출물

| 항목 | 설명 |
|------|------|
| `src/app/(authenticated)/work/[id]/page.tsx` | 업무지원 상세 화면 신규 구현 |
| `src/app/(authenticated)/dashboard/page.tsx` (수정) | 상세 보기 링크 + formatDate 공통 함수 교체 |
| `src/app/(authenticated)/dictionary/[id]/page.tsx` (수정) | formatDate 공통 함수 교체 |

---

## 기술 고려사항

- `actionItems`는 DB `TEXT` 컬럼에 JSON 배열 문자열로 저장됨 → 렌더링 전 `JSON.parse()` 필요, 파싱 실패 시 빈 배열로 폴백
- 용어 태그 색상은 `getCategoryColor(category)` Tailwind 유틸리티 클래스로 분기
- `/work/[id]`는 `(authenticated)` 그룹 내에 위치하므로 `layout.tsx`의 세션 인증이 자동 적용됨
- `formatDate` 공통 함수는 `undefined`도 처리 가능한 시그니처 (`string | null | undefined`)
