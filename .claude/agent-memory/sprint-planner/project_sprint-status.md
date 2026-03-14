---
name: sprint-status
description: 프로젝트 스프린트 진행 현황 및 각 스프린트의 주요 목표
type: project
---

Sprint 1이 구현 완료 상태이며, Sprint 2 계획 수립 전 상태이다.

**Why:** 10 Sprint / 5 Phase 구성이며 Phase 1 Sprint 1이 첫 번째 스프린트이다.

**How to apply:** 다음 스프린트 계획 시 Sprint 2로 번호를 설정한다.

## 스프린트 현황

| 스프린트 | 상태 | 주요 목표 | 계획 문서 |
|---------|------|---------|---------|
| Sprint 1 | 구현 완료 (2026-03-15) | Next.js 프로젝트 초기화 + DB 스키마 7개 테이블 + 로그인 화면 UI + 관리자 계정 자동 생성 | docs/sprint/sprint1.md |
| Sprint 2 | 예정 | 로그인 API + 세션 + 인증 미들웨어 + 사용자 관리 | - |
| Sprint 3 | 예정 | GNB + 환경설정 화면/API | - |
| Sprint 4 | 예정 | 대시보드 화면 + 서비스 상태 API | - |
| Sprint 5 | 예정 | 메일 수신 + 파일 저장 + 스케줄러 | - |
| Sprint 6 | 예정 | 용어 분석 파이프라인 | - |
| Sprint 7 | 예정 | 용어사전 뷰어 + 검색 + 트렌드 | - |
| Sprint 8 | 예정 | 업무지원 상세 + 대시보드 연동 완성 | - |
| Sprint 9 | 예정 | 에러 처리 + 접근성 + FTS5 최적화 | - |
| Sprint 10 | 예정 | 성능 최적화 + 배포 + 문서화 | - |

## Sprint 1 주요 달성 사항

- .NET 잔여 파일 정리 완료 (WinUI 3 기반 이전 구현 제거)
- domain-dictionary/ 에 Next.js 16.1.6 프로젝트 초기화 완료
- 7개 테이블 Drizzle ORM 스키마 정의 및 data/app.db 적용 완료
- 초기 관리자 계정 자동 생성 로직 (instrumentation.ts)
- 로그인 화면 UI 구현 (클라이언트 유효성 검사, Sprint 2에서 API 연결 예정)
- npm run build 및 lint 통과
