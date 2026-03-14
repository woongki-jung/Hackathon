---
name: Sprint 3 완료 상태
description: Sprint 3 완료 내역, Playwright 검증 결과, 코드 리뷰 이슈, PR 정보
type: project
---

Sprint 3 완료 (2026-03-15). GNB, 토스트 시스템, 환경설정 API/화면, 사용자 관리 API/화면 구현 완료.

**Why:** Phase 2 관리자 UI 기반 확립. Sprint 2 이월 태스크(T2-6, T2-7, T2-8) 포함.

**How to apply:** Sprint 4 시작 시 이 상태 참고. 다음 마일스톤은 Sprint 4 (대시보드 화면 + 서비스 상태 API).

## 주요 구현 파일
- `src/components/layout/GNB.tsx` — Client Component, props로 username/role 받음
- `src/components/ui/Toast.tsx` + `src/lib/toast/toast-context.tsx` — 전역 토스트
- `src/lib/config/settings-service.ts` — better-sqlite3 동기 DB (async 선언은 불일치 이슈 있음)
- `src/lib/auth/require-admin.ts` — `requireAdmin()` + `isNextResponse()` 패턴
- `src/app/api/config/route.ts`, `test-mail/route.ts`
- `src/app/api/users/route.ts`, `[id]/route.ts`
- `src/app/(authenticated)/settings/page.tsx`, `admin/users/page.tsx`

## PR 정보
- gh 인증 없어 자동 생성 미완료
- PR 생성 URL: https://github.com/woongki-jung/Hackathon/pull/new/sprint3
- 브랜치: sprint3 → main

## Playwright 검증 결과
- 전 항목 통과 (로그인, GNB, 모바일 햄버거, 환경설정, 사용자 관리)
- 콘솔 에러 없음
- 스크린샷: docs/sprint/sprint3/ (01~10번)

## 코드 리뷰 이슈
- H-1: settings-service.ts async 함수 선언 불일치 (동작 무관, Sprint 4에서 개선 권장)
- M-1: 사용자 등록일 날짜 형식 toLocaleDateString('ko-KR') — Sprint 8 T8-5 통일 예정
- M-2: GNB Client Component로만 구현 (세션 props 전달 방식, 보안 위험 낮음)
- M-3: IMAP 연결 실패 시 logout 미호출 (finally 블록 누락)

## 특이사항
- 실제 DB admin 계정은 `admin / Admin123!` (.env.local 기준), CLAUDE.local.md의 woongs 계정 아님
- 사용자 삭제 확인: window.confirm 대신 인라인 UI 구현됨 (UX 동등 이상)
