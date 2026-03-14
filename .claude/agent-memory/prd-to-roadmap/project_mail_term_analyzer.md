---
name: mail-term-analyzer-project
description: 메일 수신 업무용어 분석 웹 서비스 프로젝트 - Next.js 15, SQLite, Claude API 기반
type: project
---

메일 수신 -> 용어 추출 -> Claude 해설 생성 -> 용어사전 웹 뷰어 제공하는 웹 서비스.

**Why:** 업무 중 이메일에 포함된 EMR/비즈니스 용어의 이해도를 높여 소통을 개선하기 위한 도구.

**How to apply:**
- 기술 스택: Next.js 15 (App Router), better-sqlite3 + Drizzle ORM, iron-session + bcrypt, imapflow, @anthropic-ai/sdk, node-cron, Tailwind CSS
- 5 Phase / 10 Sprint 계획, 소규모 팀 (1-2명)
- Phase 1: 프로젝트 초기화 + DB 스키마 + 인증(로그인/세션/사용자관리)
- Phase 2: GNB + 환경설정 + 대시보드 + 서비스 상태
- Phase 3: 메일 수신 + 스케줄러 + 용어 분석 파이프라인 (Claude API)
- Phase 4: 용어사전 뷰어(검색/상세) + 업무지원 상세 + 전체 네비게이션
- Phase 5: 안정화 + 접근성 + 성능 최적화 + 배포
- 사양 문서: 정책 5건, 데이터 7건, 기능 24건, API 16건, 화면 7건
- ROADMAP.md 생성일: 2026-03-15 (기술 스택 전환 후 재시작)
- 이전 기술 스택(.NET WPF)에서 Next.js 15 웹 서비스로 전환
