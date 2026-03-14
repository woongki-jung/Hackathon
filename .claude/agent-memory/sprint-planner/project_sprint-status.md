---
name: sprint-status
description: 프로젝트 스프린트 진행 현황 및 각 스프린트의 주요 목표
type: project
---

Sprint 1, 2, 3이 구현 완료 상태이며, Sprint 4 계획 수립 완료 상태이다.

**Why:** 10 Sprint / 5 Phase 구성이며 Phase 1 완료, Phase 2 진행 중이다.

**How to apply:** 다음 스프린트 계획 시 Sprint 5로 번호를 설정한다.

## 스프린트 현황

| 스프린트 | 상태 | 주요 목표 | 계획 문서 |
|---------|------|---------|---------|
| Sprint 1 | 구현 완료 (2026-03-15) | Next.js 프로젝트 초기화 + DB 스키마 7개 테이블 + 로그인 화면 UI + 관리자 계정 자동 생성 | docs/sprint/sprint1.md |
| Sprint 2 | 구현 완료 (2026-03-15) | 로그인 API + 세션 + 인증 미들웨어 (사용자 관리는 Sprint 3으로 이월) | docs/sprint/sprint2.md |
| Sprint 3 | 구현 완료 (2026-03-15) | GNB + 토스트 시스템 + 환경설정 API/화면 + 사용자 관리 API/화면 (Sprint 2 이월 포함) | docs/sprint/sprint3.md |
| Sprint 4 | 계획 완료 / 구현 예정 | 로깅 유틸리티 + 서비스 상태 API + 분석 결과 API + 대시보드 화면 교체 + 수동 메일 트리거 API | docs/sprint/sprint4.md |
| Sprint 5 | 예정 | 메일 수신 + 파일 저장 + 스케줄러 | - |
| Sprint 6 | 예정 | 용어 분석 파이프라인 | - |
| Sprint 7 | 예정 | 용어사전 뷰어 + 검색 + 트렌드 | - |
| Sprint 8 | 예정 | 업무지원 상세 + 대시보드 연동 완성 | - |
| Sprint 9 | 예정 | 에러 처리 + 접근성 + FTS5 최적화 | - |
| Sprint 10 | 예정 | 성능 최적화 + 배포 + 문서화 | - |

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
