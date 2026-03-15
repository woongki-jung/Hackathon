# Sprint 7 코드 리뷰 보고서

> 검토 일자: 2026-03-15
> 검토 대상 브랜치: sprint7
> 검토자: sprint-close agent (code-reviewer)

---

## 검토 대상 파일

| 파일 | 역할 |
|------|------|
| `src/app/api/dictionary/search/route.ts` | 용어 검색 API (FTS5 전문 검색 + 카테고리 필터 + 페이지네이션) |
| `src/app/api/dictionary/trending/route.ts` | 빈도 트렌드 API (상위 10개) |
| `src/app/api/dictionary/terms/[id]/route.ts` | 용어 상세 API (용어 정보 + 출처 메일 목록) |
| `src/app/(authenticated)/dictionary/page.tsx` | 용어사전 뷰어 화면 |
| `src/app/(authenticated)/dictionary/[id]/page.tsx` | 용어 상세 화면 |
| `src/lib/utils/category.ts` | 카테고리 레이블/색상 유틸리티 |

---

## 종합 평가

**전체 등급: 양호 (Critical/High 이슈 없음)**

Sprint 7 구현은 전반적으로 계획 대비 충실하게 구현되었습니다. Suspense 래퍼 적용, Link 컴포넌트 사용, bm25() FTS5 정렬 등 계획에서 리스크로 식별된 항목을 모두 올바르게 처리했습니다. Medium 이슈 3건과 Suggestion 3건이 발견되었으며, 서비스 운영에 즉각적인 영향은 없습니다.

---

## 이슈 목록

### Medium 이슈

#### M-01: terms/[id]/route.ts — 정렬 후 reverse() 패턴 비효율
**위치:** `src/app/api/dictionary/terms/[id]/route.ts` 41~44행
```typescript
.orderBy(termSourceFiles.mailReceivedAt)
.limit(10)
.all()
.reverse(); // 최신순
```
**문제:** Drizzle ORM의 `.orderBy()`에 `desc()` 대신 오름차순 정렬 후 JS 배열 `reverse()`를 호출합니다. LIMIT 10이 오름차순으로 먼저 적용되어 "가장 오래된 10건을 역순 표시"하게 됩니다. 사양(최신순 최대 10건)과 불일치합니다.
**권장 수정:** `desc(termSourceFiles.mailReceivedAt)` 사용, `reverse()` 제거.
**Sprint 9에서 수정 권장.**

#### M-02: search/route.ts — AND t.deleted_at IS NULL 조건 비일관성
**위치:** `src/app/api/dictionary/search/route.ts` 50행
```sql
WHERE terms_fts MATCH ? AND t.category = ? AND t.deleted_at IS NULL
```
**문제:** FTS5 + 카테고리 필터 쿼리에는 `deleted_at IS NULL` 조건이 있으나, FTS5 단독 쿼리(catFilter 없는 경우)와 전체 조회 쿼리에는 해당 조건이 누락되어 있습니다. 소프트 삭제된 용어가 검색 결과에 포함될 수 있습니다.
**권장 수정:** 모든 쿼리에 `AND t.deleted_at IS NULL` 또는 `WHERE deleted_at IS NULL` 조건 일관 적용.
**Sprint 9에서 수정 권장.**

#### M-03: dictionary/page.tsx — 검색 오류 시 사용자 피드백 없음
**위치:** `src/app/(authenticated)/dictionary/page.tsx` 64~69행
```typescript
const res = await fetch(`/api/dictionary/search?${params}`);
const json = await res.json();
if (json.success) {
  setResults(json.data.items);
  setPagination(json.data.pagination);
}
// json.success가 false여도 아무것도 하지 않음
```
**문제:** API 응답이 실패(success: false)인 경우 사용자에게 아무런 피드백이 없습니다. 로딩 인디케이터만 사라지고 결과가 그대로 유지됩니다.
**권장 수정:** `else` 분기에서 toast 알림 또는 에러 상태 표시.
**Sprint 9에서 수정 권장.**

---

### Suggestion (제안)

#### S-01: category.ts — getCategoryLabel 폴백 값
**위치:** `src/lib/utils/category.ts` 20행
```typescript
return CATEGORY_LABELS[category ?? ''] ?? '일반';
```
**제안:** 알 수 없는 카테고리가 '일반'으로 표시되면 실제 'general' 카테고리와 시각적으로 구별이 되지 않습니다. `'기타'` 또는 `category` 원본 값을 그대로 반환하는 방식 검토.

#### S-02: search/route.ts — sqlite.prepare() 매 요청마다 재컴파일
**위치:** `src/app/api/dictionary/search/route.ts` 전반
**제안:** `sqlite.prepare()`는 매 요청마다 SQL을 재파싱합니다. 모듈 레벨에서 캐시하거나 better-sqlite3의 `prepare()` 결과를 상수로 선언하면 성능 향상 가능 (처리량이 높아질 Sprint 9+ 시점에 검토).

#### S-03: dictionary/[id]/page.tsx — formatDate 함수 중복
**위치:** `dictionary/page.tsx`와 `dictionary/[id]/page.tsx` 양쪽에 동일한 `formatDate` 함수 존재
**제안:** `src/lib/utils/date.ts`로 공통 유틸리티로 추출하여 코드 중복 제거 (Sprint 8 T8-5 날짜/시간 표시 통일 작업 시 함께 처리 권장).

---

## Sprint 6 이월 이슈 처리 현황

| 이슈 | 상태 |
|------|------|
| M-01: mail-batch.ts JSDoc 주석 업데이트 | ⬜ 미처리 (Sprint 8 이월) |
| M-02: batch-analyzer.ts Gemini API 병렬 호출 | ⬜ 미처리 (Sprint 9 검토) |
| M-03: dictionary-store.ts SELECT-then-UPDATE 비원자성 | ⬜ 미처리 (Sprint 9 검토) |

---

## Sprint 8 이월 권장 항목

- M-01: `terms/[id]/route.ts` `reverse()` 패턴 수정 → `desc()` 적용
- M-02: `search/route.ts` `deleted_at IS NULL` 조건 일관 적용
- S-03: `formatDate` 유틸리티 공통화 (T8-5 날짜 통일 작업 시 함께 처리)
