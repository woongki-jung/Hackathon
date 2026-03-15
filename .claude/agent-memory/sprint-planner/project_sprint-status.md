---
name: sprint-status
description: 프로젝트 스프린트 진행 현황 및 각 스프린트의 주요 목표
type: project
---

Sprint 1~9가 구현 완료 상태이며, Sprint 10 계획 수립 완료 상태이다.

**Why:** 10 Sprint / 5 Phase 구성이며 Phase 1~4 완료(Sprint 8까지), Phase 5 Sprint 9~10 계획 수립됨. Sprint 10은 전체 마지막 스프린트로 M5(정식 릴리스) 마일스톤 달성이 목표이다.

**How to apply:** Sprint 10이 최종 스프린트이다. 모든 스프린트 계획 완료 상태.

## 스프린트 현황

| 스프린트 | 상태 | 주요 목표 | 계획 문서 |
|---------|------|---------|---------|
| Sprint 1 | 구현 완료 (2026-03-15) | Next.js 프로젝트 초기화 + DB 스키마 7개 테이블 + 로그인 화면 UI + 관리자 계정 자동 생성 | docs/sprint/sprint1.md |
| Sprint 2 | 구현 완료 (2026-03-15) | 로그인 API + 세션 + 인증 미들웨어 (사용자 관리는 Sprint 3으로 이월) | docs/sprint/sprint2.md |
| Sprint 3 | 구현 완료 (2026-03-15) | GNB + 토스트 시스템 + 환경설정 API/화면 + 사용자 관리 API/화면 (Sprint 2 이월 포함) | docs/sprint/sprint3.md |
| Sprint 4 | 구현 완료 (2026-03-15) | 로깅 유틸리티 + 서비스 상태 API + 분석 결과 API + 대시보드 화면 교체 + 수동 메일 트리거 API | docs/sprint/sprint4.md |
| Sprint 5 | 구현 완료 (2026-03-15) | 메일 수신 + 파일 저장 + 스케줄러 | docs/sprint/sprint5.md |
| Sprint 6 | 구현 완료 (2026-03-15) | 용어 분석 파이프라인 (Gemini API 연동) | docs/sprint/sprint6.md |
| Sprint 7 | 구현 완료 (2026-03-15) | 용어사전 뷰어 + 검색 + 트렌드 | docs/sprint/sprint7.md |
| Sprint 8 | 구현 완료 (2026-03-15) | 업무지원 상세 + 대시보드 연동 완성 | docs/sprint/sprint8.md |
| Sprint 9 | 계획 완료 (2026-03-15) | 에러 처리 + 접근성 + FTS5 최적화 + 파일 동기화 + 반응형 점검 | docs/sprint/sprint9.md |
| Sprint 10 | 계획 완료 (2026-03-15) | 성능 최적화 + 보안 강화 + 기술 부채 + 배포 + 사용자 가이드 | docs/sprint/sprint10.md |

## Sprint 1 주요 달성 사항

- domain-dictionary/ 에 Next.js 16.1.6 프로젝트 초기화 완료
- 7개 테이블 Drizzle ORM 스키마 정의 및 data/app.db 적용 완료
- 초기 관리자 계정 자동 생성 로직 (instrumentation.ts)
- 로그인 화면 UI 구현 (클라이언트 유효성 검사)
- npm run build 및 lint 통과

## Sprint 2 주요 달성 사항

- iron-session 기반 세션 관리 (쿠키명: domain-dict-session, 24시간)
- 로그인/로그아웃/me API 구현 (POST/POST/GET /api/auth/*)
- Next.js 인증 미들웨어 (proxy.ts) - 미인증 시 /login 리다이렉트
- 대시보드 플레이스홀더 페이지 추가
- 사용자 관리 API/화면, 공통 레이아웃 → Sprint 3으로 이월

## Sprint 3 주요 달성 사항

- T2-6, T2-7, T2-8 이월 태스크 + T3-1~T3-5 신규 태스크 통합 구현 완료
- GNB (Client Component), ToastProvider + ToastContainer, requireAdmin 유틸리티 구현
- 환경설정 API (GET/PUT /api/config), 연결 테스트 API 구현
- 사용자 관리 API (GET/POST /api/users, DELETE /api/users/[id]) 구현
- 환경설정 화면, 사용자 관리 화면 구현

## Sprint 4 계획 핵심 사항

- dashboard/page.tsx는 플레이스홀더 상태 — 전면 교체 대상
- 서비스 상태 API는 admin/user 모두 접근 가능 (requireAdmin() 대신 세션 userId 확인)
- 수동 메일 확인 API는 admin 전용 (requireAdmin() 사용)
- Sprint 4에서 스케줄러 상태는 항상 'stopped' 반환 (Sprint 5에서 실제 반영)
- isRunning 플래그는 HMR에서 초기화되는 한계가 있으나 Sprint 5에서 해결
- 날짜 포맷 함수(formatDateTime)를 대시보드 페이지 내 인라인으로 정의 후 Sprint 8에서 공통 유틸리티로 분리 예정
- analysisQueue, mailProcessingLogs에 실데이터 없으므로 빈 상태 표시가 핵심 검증 항목

## Sprint 5 계획 핵심 사항

- html-to-text 패키지가 미설치 상태 — T5-4 시작 전 반드시 설치 필요 (`npm install html-to-text @types/html-to-text`)
- imapflow, node-cron은 이미 설치됨
- mail-batch.ts가 배치 오케스트레이션의 단일 진입점 — 스케줄러와 API route 모두 이 함수 호출
- global.__scheduler 싱글톤으로 HMR 중복 초기화 방지
- api/mail/check/route.ts의 플레이스홀더 setTimeout을 runMailBatch() 호출로 교체
- api/mail/status/route.ts에서 global.__scheduler 존재 여부로 스케줄러 상태 'running'/'stopped' 반환
- analysis_queue의 fileName UNIQUE 제약으로 중복 삽입 자동 방지
- 구현 권장 순서: T5-1 → T5-2 → T5-3 → T5-4 → T5-5 → T5-6 → mail-batch.ts → T5-7 → T5-8

## Sprint 6 계획 핵심 사항

- @google/generative-ai 패키지 이미 설치됨, GEMINI_API_KEY / GEMINI_MODEL 환경변수 사용
- GLOSSARY_STORAGE_PATH 환경변수로 용어 해설집 저장 경로 지정 (기본 ./data/terms)
- gemini-client.ts: 모델명은 DB settings(analysis.model) > GEMINI_MODEL 환경변수 > 기본값 순으로 결정
- API 키 미설정 시 GeminiApiError(NO_API_KEY) → batch-analyzer에서 pending 유지 + 배치 중단
- Gemini 응답 파싱: JSON 코드 블록 마커(```json) 제거 후 JSON.parse 처리 필수
- term-extractor.ts에 T6-5 용어 분류 기능이 포함됨 (별도 파일 없음)
- dictionary-store.ts: upsertTerm()에서 terms 테이블 upsert + ./data/terms/{용어}.md 파일 동시 생성
- 용어명 파일명 변환: / \ ? % * : | " < > 문자를 _로 치환
- mail-batch.ts Phase 2 주석 부분에 runBatchAnalysis() 호출 추가 — 기존 isRunning 잠금 재사용
- 구현 권장 순서: pii-filter → gemini-client → stopword-filter → term-extractor → description-generator → dictionary-store → batch-analyzer → mail-batch 연동

## Sprint 8 계획 핵심 사항

- GET /api/analysis/[id] (ANAL-003) API가 이미 구현 완료 상태
- src/lib/utils/date.ts의 formatDate 공통 함수가 이미 존재 (Sprint 7에서 생성)
- dashboard/page.tsx, dictionary/[id]/page.tsx는 아직 인라인 formatDate 사용 → T8-3에서 교체
- admin/users/page.tsx는 formatDate 미사용 → T8-3 대상 아님
- actionItems는 DB TEXT 컬럼에 JSON 배열 문자열로 저장 → JSON.parse 필요, 실패 시 빈 배열 폴백
- GNB isActive 로직: /dashboard는 exact match, 나머지는 startsWith — /work/[id]는 GNB 메뉴 없으므로 별도 처리 불필요
- 구현 권장 순서: T8-3(formatDate 교체) → T8-1(업무지원 상세) → T8-2(대시보드 연동) → T8-4(네비게이션 검증)

## Sprint 7 계획 핵심 사항

- FTS5 raw SQL 실행을 위해 db.$client (better-sqlite3 인스턴스) 접근 필요 → getRawSqlite() 헬퍼를 src/db/index.ts에 추가
- FTS5 MATCH 쿼리 특수문자('"*^()) 제거 필수 — 미제거 시 SQLite 에러 발생
- 검색어 없을 때는 FTS5 대신 일반 SELECT + ORDER BY frequency DESC 사용
- useSearchParams()를 사용하는 Client Component는 반드시 <Suspense>로 래퍼 필요 (Next.js App Router 빌드 경고)
- params가 Next.js 15에서 Promise<{ id: string }> 타입 — await params 또는 .then() 패턴 사용
- <a> 태그 대신 <Link> 컴포넌트 사용 (next/link)
- 카테고리 색상 유틸리티는 src/lib/utils/category.ts에 분리
- 검색 URL 파라미터 동기화: ?q=keyword&category=emr&page=1 형태, router.replace() 사용
- 구현 권장 순서: T7-1(search API) → T7-2(trending API) → T7-3(detail API) → T7-4(뷰어 화면) → T7-5(상세 화면) → 빌드/린트

## Sprint 9 계획 핵심 사항

- not-found.tsx, error.tsx — Server Component 가능. (authenticated)/error.tsx — 'use client' 필수
- 로그인 폼(login/page.tsx)은 이미 접근성 속성(aria-describedby, aria-invalid) 완비 → 수정 불필요
- GNB Toast.tsx에 이미 role="alert" 있음 → aria-live="polite" 컨테이너 추가만 필요
- FTS5 snippet() 컬럼 인덱스 0-based: name=0, description=1
- snippet 마커로 [[ / ]] 사용 — React 요소 직접 생성으로 안전한 하이라이팅 구현
- dictionary-store.ts의 toSafeFileName, buildGlossaryMarkdown을 export로 변경하여 sync-terms route에서 재사용
- file-manager.ts에 fileExists() 함수 이미 구현됨 (fs.existsSync 기반) — Sprint 10에서 sync-terms가 이를 사용하도록 리팩토링
- DB 마이그레이션 없음 — 빌드/린트 자동 검증만 수행
- 구현 권장 순서: T9-1 → T9-2 → T9-4 → T9-3 → T9-5 → 빌드/린트

## Sprint 10 계획 핵심 사항

- `revalidate` Route Segment Config: `export const revalidate = N;` 형태로 파일 상단에 선언 (`runtime` 상수 바로 아래)
- Rate limiting: 외부 패키지 없이 모듈 레벨 Map으로 구현, IP는 `x-forwarded-for` 헤더 또는 'unknown' 폴백
- 보안 헤더: `next.config.ts`의 async `headers()` 함수 — `source: '/(.*)'`로 모든 경로 적용
- `dictionary-store.ts`의 `buildGlossaryMarkdown`은 Sprint 9 완료 시 이미 export 상태일 가능성 있음 → 실제 파일 확인 후 중복 export 방지
- `sync-terms/route.ts` 리팩토링 핵심: `fs` 직접 import 제거, `fileExists` import 추가, 로컬 함수 정의 제거 후 `dictionary-store`에서 import
- GNB `role="list"/"listitem"` 제거: `<nav>` 내부의 링크 컨테이너와 각 Link 태그에서 해당 속성만 제거, 나머지 로직 수정 불필요
- `docs/deploy/` 디렉터리 신규 생성 필요
- `ecosystem.config.js`는 `domain-dictionary/` 루트에 위치
- SESSION_SECRET 환경변수: Sprint 1~2에서 `.env.local.example`에 누락됐을 가능성 높음 → 반드시 추가
- DB 마이그레이션 없음 — 빌드/린트 자동 검증만 수행
- 구현 권장 순서: T10-5(부채 정리) → T10-1(캐싱) → T10-2(보안) → T10-3(배포 설정) → T10-4(가이드) → 빌드/린트
