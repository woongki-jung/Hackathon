---
name: Sprint 7 완료 상태
description: Sprint 7 완료 내역, Playwright 검증 결과, 코드 리뷰 이슈, Sprint 8 이월 항목
type: project
---

Sprint 7 완료 (2026-03-15). 브랜치: sprint7.

**Why:** 용어사전 뷰어 + 검색 + 트렌드 기능 구현 완료. Phase 4 첫 번째 스프린트 완성.

**How to apply:** Sprint 8 시작 전 실제 용어 데이터 환경에서 수동 검증 필요. `/work/[id]` 화면 구현이 다음 스프린트 핵심 과제.

## 구현 완료 태스크
- T7-1: 용어 검색 API (`src/app/api/dictionary/search/route.ts`) — FTS5 전문 검색, 카테고리 필터, 페이지네이션 20건
- T7-2: 빈도 트렌드 API (`src/app/api/dictionary/trending/route.ts`) — 빈도 상위 10개
- T7-3: 용어 상세 API (`src/app/api/dictionary/terms/[id]/route.ts`) — 용어 정보 + 출처 메일 최신순 10건
- T7-4: 용어사전 뷰어 화면 (`src/app/(authenticated)/dictionary/page.tsx`) — 300ms 디바운스, URL 동기화, Suspense 래퍼
- T7-5: 용어 상세 화면 (`src/app/(authenticated)/dictionary/[id]/page.tsx`) — 해설 전문, 출처 목록, 404 처리
- 공통: 카테고리 유틸리티 (`src/lib/utils/category.ts`)

## 버그 수정 (sprint-close 시 발견 및 수정)
- BUG-01: `search/route.ts` FTS5+카테고리 필터 조합 시 500 에러
  - 원인: `AND t.deleted_at IS NULL` 조건 포함, terms 테이블에 deleted_at 컬럼 미존재
  - 수정: 해당 조건 제거 (커밋: fix: 검색 API FTS5+카테고리 쿼리에서 존재하지 않는 deleted_at 컬럼 제거)

## 자동 검증 결과
- npm run build: 통과 (사전 완료)
- npm run lint: 통과 (사전 완료)
- GET /api/dictionary/search: 200 OK
- GET /api/dictionary/search?q=EMR&category=emr: 200 OK (버그 수정 후)
- GET /api/dictionary/trending: 200 OK (빈 배열, 정상)
- GET /api/dictionary/terms/nonexistent-id: 404 정상
- 용어사전 뷰어 화면: 정상 렌더링, 빈 상태 표시
- 검색어 URL 동기화: 정상
- 빈 검색 결과 메시지: 정상
- 용어 상세 404: 정상
- 콘솔 에러: 0건

## 코드 리뷰 이슈 (Medium)
- M-01: `terms/[id]/route.ts` — `.orderBy()` 오름차순 + `.reverse()` 패턴. LIMIT 10이 오름차순 먼저 적용되어 실제 최신 10건이 아닐 수 있음. `desc()` 사용 권장 (Sprint 9)
- M-02: `search/route.ts` — 쿼리별 조건 비일관성 (catFilter 없는 FTS5, 전체 조회에 deleted_at 조건 없음) → Sprint 9에서 스키마 재검토 후 정리
- M-03: `dictionary/page.tsx` — API 실패(success: false) 시 사용자 피드백 없음 → Sprint 9

## Sprint 8 이월 항목
- `/work/[id]` 업무지원 상세 화면 구현 (T8-1)
- 대시보드 → 업무지원 상세 연동 (T8-2)
- 업무지원 상세 → 용어 상세 연동 (T8-3)
- 전체 화면 네비게이션 검증 (T8-4)
- 날짜/시간 "YYYY-MM-DD HH:mm" 통일 + formatDate 유틸리티 공통화 (T8-5)
- 실제 용어 데이터 환경에서 FTS5 검색/트렌드/상세 수동 검증

## PR 정보
- PR URL: https://github.com/woongki-jung/Hackathon/pull/new/sprint7
- gh CLI 인증 없어 PR 직접 생성 불가 — deploy.md에 URL 안내 기재

## 앱 관리자 계정 (검증 환경)
- username: admin / password: Admin123! (domain-dictionary/.env.local 기준)
- CLAUDE.local.md의 woongs 계정은 현재 앱 DB에 미등록 상태
