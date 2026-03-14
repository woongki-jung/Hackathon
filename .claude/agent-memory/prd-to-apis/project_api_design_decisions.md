---
name: API 설계 주요 결정 사항
description: 메일 용어 해설 웹 서비스의 REST API 인터페이스 설계 주요 결정 사항 (Next.js 15 App Router 기반)
type: project
---

## API 인터페이스 구조

Next.js 15 App Router Route Handlers (`app/api/`) 기반 REST API. Base URL: `/api`.

### API 그룹 및 코드 채번

| 그룹 | 접두사 | 엔드포인트 수 | 설명 |
|------|--------|-------------|------|
| Auth | AUTH- | 3 | 로그인/로그아웃/세션 조회 |
| User | USER- | 3 | 사용자 CRUD (관리자 전용) |
| Config | CFG- | 3 | 환경설정 조회/수정/메일 테스트 |
| Mail | MAIL- | 2 | 서비스 상태/수동 트리거 |
| Analysis | ANAL- | 2 | 최신/이력 분석 결과 |
| Dictionary | DICT- | 3 | 검색/트렌드/상세 |
| External | CLAUDE- | 1 | Claude API 호출 (서버 사이드) |

**Why:** 웹 서비스이므로 클라이언트-서버 REST API 구조. 이전 .NET 데스크톱 앱 구조와 완전히 다름.

**How to apply:** 모든 API는 `/api/` 접두사로 Route Handler로 구현. 인증은 iron-session 쿠키 기반.

## 인증 패턴

- iron-session 암호화 HTTP-only 쿠키 세션 (24시간 TTL)
- 역할: admin / user (2가지)
- 인증 불필요 엔드포인트: POST /api/auth/login, GET /api/health
- admin 전용: User, Config, POST /api/mail/check
- all: Auth(logout/me), Mail(status), Analysis, Dictionary

## 주요 설계 결정

- 버전 접두사 없음 (단일 서비스 내부 API)
- 페이지네이션: page/limit 기반 (ANAL-002, DICT-001)
- 민감정보: passwordConfigured/apiKeyConfigured boolean 반환 (AUTH-R-020)
- CLAUDE-001: REST 엔드포인트가 아닌 서버 사이드 외부 호출 (@anthropic-ai/sdk)
- api_graph.md 제거 (Microsoft Graph API 불필요)
