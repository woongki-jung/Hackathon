---
name: Sprint 8 완료 상태
description: Sprint 8 완료 내역, Playwright 검증 결과, 코드 리뷰 이슈, Sprint 9 이월 항목
type: project
---

Sprint 8 완료 (2026-03-15). 브랜치: sprint8.

**Why:** 업무지원 상세 화면(WORK-001) 신규 구현 + 대시보드 연동 완성. Phase 4 최종 스프린트 완성으로 M4 마일스톤(전체 UI MVP) 달성.

**How to apply:** Sprint 9 시작 전 날짜 포맷 버그(M-01) 및 추출 용어 수 표시 버그(M-02) 수정 필요.

## 구현 완료 태스크
- T8-1: 업무지원 상세 화면 (`src/app/(authenticated)/work/[id]/page.tsx`) — 메일 정보, AI 요약, 후속 작업 체크리스트, 추출 용어 태그
- T8-2: 대시보드 → 업무지원 상세 연동 (`dashboard/page.tsx`) — "상세 보기"/"보기" 링크 추가
- T8-3: 업무지원 상세 → 용어 상세 연동 — 용어 태그에 `/dictionary/{termId}` href
- T8-4: 전체 화면 네비게이션 검증 — GNB 활성 하이라이트 정상, 인증 보호 정상
- T8-5: 날짜 공통 유틸 적용 (`src/lib/utils/date.ts`) — formatDate() 신규, dashboard/dictionary 인라인 제거
- API: `src/app/api/analysis/[id]/route.ts` — ANAL-003 분석 상세 API 신규 구현

## 자동 검증 결과
- npm run build: 통과 (26개 라우트, /work/[id] 포함)
- npm run lint: 통과
- Playwright: 대시보드 렌더링, 분석 결과 표시, 상세 보기 링크 URL 정상
- Playwright: /work/[id] 화면 — 메일 정보, AI 요약, 후속 작업, 추출 용어 2개 정상
- Playwright: /dictionary/{termId} 이동 정상 (직접 URL 접근 확인)
- Playwright: /work/nonexistent-id 404 처리 정상
- Playwright: GNB 용어사전 활성 하이라이트 정상
- Playwright: GNB /work/[id] 경로 하이라이트 없음 (정상)
- 콘솔 에러: 0건

## 코드 리뷰 이슈 (Medium)
- M-01: `date.ts` — formatDate()가 ko-KR 12시간제로 "오전/오후" 포함 출력. UI-R-015(YYYY-MM-DD HH:mm) 불일치 → Sprint 9 수정
- M-02: `/work/[id]` — "추출 용어 수" 항상 0 표시. API 응답에 extractedTermCount 미포함, extractedTerms.length 사용으로 수정 필요 → Sprint 9
- M-03: `analysis/[id]/route.ts` — termSourceFiles 컬럼명 스키마 일치 여부 확인 필요 (런타임 정상)

## Sprint 9 이월 항목
- 날짜 포맷 수정 (M-01): `hour12: false` 또는 ISO 직접 파싱
- 추출 용어 수 표시 수정 (M-02): `extractedTerms.length` 사용
- 전역 에러 처리 강화 (T9-1)
- 접근성 검증 (T9-2)
- FTS5 인덱스 최적화 (T9-3)
- 실제 데이터 환경에서 전체 흐름 수동 검증

## PR 정보
- PR URL: https://github.com/woongki-jung/Hackathon/pull/new/sprint8
- gh CLI 인증 없어 PR 직접 생성 불가 — URL에서 직접 생성 가능

## 앱 관리자 계정 (검증 환경)
- username: admin / password: Admin123! (domain-dictionary/.env.local 기준)
- Playwright MCP에서 UI 로그인 클릭이 동작하지 않는 현상 있음 (fetch API 직접 호출로 우회)
- 실제 브라우저에서는 정상 동작
