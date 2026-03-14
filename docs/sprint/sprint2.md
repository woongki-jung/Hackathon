# Sprint 2: 로그인 API + 세션 + 인증 미들웨어

- **기간**: 2026-03-15
- **브랜치**: sprint2
- **상태**: ✅ 완료

## 스프린트 목표

Sprint 1에서 구현한 로그인 UI에 실제 인증 API를 연결하고, iron-session 기반 세션 관리와 Next.js 미들웨어를 구현하여 인증 보호 경로를 확립한다.

## 구현 내용

### 구현 파일

| 파일 | 설명 |
|------|------|
| `domain-dictionary/src/lib/auth/session.ts` | iron-session 설정 (SessionData 타입, sessionOptions) |
| `domain-dictionary/src/app/api/auth/login/route.ts` | POST 로그인 API (bcrypt 검증, iron-session 발급) |
| `domain-dictionary/src/app/api/auth/logout/route.ts` | POST 로그아웃 API (세션 파기) |
| `domain-dictionary/src/app/api/auth/me/route.ts` | GET 현재 사용자 정보 API |
| `domain-dictionary/src/proxy.ts` | Next.js 16 인증 미들웨어 (public 경로 제외 세션 검증) |
| `domain-dictionary/src/app/(authenticated)/dashboard/page.tsx` | 로그인 후 대시보드 플레이스홀더 |
| `domain-dictionary/src/app/login/page.tsx` | 로그인 성공 시 /dashboard 리다이렉트 추가 |

### 주요 기술 결정

- **세션 저장**: iron-session (HTTP-only 암호화 쿠키, SESSION_SECRET 환경변수)
- **비밀번호 검증**: bcrypt (salt rounds: 10)
- **미들웨어 위치**: `proxy.ts` (Next.js 16 규칙)
- **로그인 성공 후 이동**: `/dashboard`

### 이월 항목 (Sprint 3)

- 사용자 관리 API (GET/POST/DELETE /api/users)
- 사용자 관리 화면 (ADMIN-001)
- 공통 레이아웃 기초 (GNB 플레이스홀더, 토스트)

## 검증 결과

- [Playwright 테스트 보고서](sprint2/test-report.md)
- [배포/검증 체크리스트](sprint2/deploy.md)

## PR

- PR #2: `feat: Sprint 2 완료 - 로그인 API, 세션 인증 미들웨어 구현`
