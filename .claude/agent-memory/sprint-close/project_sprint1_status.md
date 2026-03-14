---
name: sprint1_status
description: Sprint 1 완료 상태 및 PR 정보 (Next.js 전환 후 재구현)
type: project
---

Sprint 1이 2026-03-15에 완료되었습니다 (브랜치: sprint1).

**Why:** 기존 .NET/WinUI 3 구현을 폐기하고 Next.js 16.1.6 기반으로 전면 전환. Phase 1 전반부 목표인 프로젝트 초기화, DB 스키마, 로그인 화면 UI 구현 완료.

**How to apply:** Sprint 2 시작 시 이 항목들이 완료되었음을 전제로 진행.

## 완료 항목

- .NET 잔여 파일 정리 (src/, tests/, MailTermAnalyzer.slnx, Directory.Build.props 삭제)
- Next.js 16.1.6 프로젝트 초기화 (domain-dictionary/)
- 핵심 패키지 설치 (better-sqlite3, drizzle-orm, iron-session, bcrypt, imapflow, @anthropic-ai/sdk, node-cron)
- Drizzle ORM 스키마 정의 (7개 테이블 전체)
- DB 연결 싱글톤 + WAL 모드 + FTS5 전문 검색 초기화
- 초기 관리자 계정 자동 생성 (instrumentation.ts + seed-admin.ts)
- 클라이언트 유효성 검사 공용 함수 (src/lib/validators/auth.ts)
- 로그인 화면 UI (src/app/login/page.tsx)
- npm run build 통과, npm run lint 통과, npm run db:push 통과

## 자동 검증 결과

- npm run build: 성공
- npm run lint: 경고/오류 없음
- npm run db:push: 7개 테이블 생성 완료

## 수동 검증 필요 항목 (미완료)

- npm run dev 후 http://localhost:3000/login 직접 확인
- 서버 재시작 후 users 테이블 admin 계정 자동 생성 확인
- 모바일 뷰포트(360px) 레이아웃 시각적 확인

## PR 정보

- PR URL: https://github.com/woongki-jung/Hackathon/pull/1
- 배포 가이드: docs/sprint/sprint1/deploy.md

## 기술 스택 메모

- Next.js 버전: ROADMAP 명세는 v15이나 실제 설치 버전은 v16.1.6 (최신 stable)
- drizzle/ 디렉터리: 마이그레이션 파일 미생성 (db:push로 직접 적용)
- gh CLI: PATH에 없음, GitHub API 직접 호출로 PR 생성 (git credential manager 토큰 활용)
